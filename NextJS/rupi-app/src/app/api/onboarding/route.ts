import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool, { TransactionDatabase, UserWalletDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const body = await request.json();

    const {
      displayName,
      currency: _ignoredCurrency,
      occupation,
      wallets,
      financialGoalTarget,
      theme,
      language,
      discoverySource,
      acceptedTerms,
      acceptedPrivacy,
      consentFinancialAnalysis,
    } = body;

    // Enforce IDR as the only supported currency regardless of client input
    const enforcedCurrency = 'IDR';

    // Basic validation for consent
    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json({ success: false, error: 'You must accept terms and privacy policy.' }, { status: 400 });
    }

    // Upsert profile
    await pool.query(
      `INSERT INTO user_profiles (user_id, display_name, currency, occupation, financial_goal_target, discovery_source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         currency = EXCLUDED.currency,
         occupation = EXCLUDED.occupation,
         financial_goal_target = EXCLUDED.financial_goal_target,
         discovery_source = EXCLUDED.discovery_source,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, displayName || null, enforcedCurrency, occupation || null, financialGoalTarget || null, discoverySource || null]
    );

    // Upsert preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id, theme, language)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET
         theme = EXCLUDED.theme,
         language = EXCLUDED.language,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, theme || 'system', language || 'en']
    );

    // Upsert consent
    await pool.query(
      `INSERT INTO user_consents (user_id, accepted_terms, accepted_privacy, consent_financial_analysis, accepted_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         accepted_terms = EXCLUDED.accepted_terms,
         accepted_privacy = EXCLUDED.accepted_privacy,
         consent_financial_analysis = EXCLUDED.consent_financial_analysis,
         accepted_at = CURRENT_TIMESTAMP`,
      [userId, !!acceptedTerms, !!acceptedPrivacy, !!consentFinancialAnalysis]
    );

    // Create initial wallet(s) and balances if provided (reuse wallets flow conventions)
    let createdWalletId: number | undefined;
    if (Array.isArray(wallets) && wallets.length > 0) {
      // Load existing wallets once and dedupe by normalized name
      const existing = await UserWalletDatabase.getAllWallets(userId);
      const existingByName = new Map(existing.map(w => [w.name.trim().toLowerCase(), w]));

      for (const w of wallets) {
        const rawName: string = (w?.name || '').toString();
        const name = rawName.trim();
        if (!name) continue;
        const type: string = (w?.type || 'bank').toString();
        const bal: number = Number(w?.balance || 0);
        const color: string | undefined = typeof w?.color === 'string' && w.color ? w.color : undefined;

        const key = name.toLowerCase();
        const found = existingByName.get(key);

        if (found) {
          // Wallet already exists, do not create or seed again
          if (createdWalletId === undefined) createdWalletId = found.id;
          continue;
        }

        // Create new wallet
        const wallet = await UserWalletDatabase.createWallet(userId, name, type, color);
        existingByName.set(key, wallet);
        if (createdWalletId === undefined) createdWalletId = wallet.id;

        // Seed initial balance only for newly created wallet
        if (!Number.isNaN(bal) && bal > 0) {
          await TransactionDatabase.createTransaction(
            userId,
            `Initial balance for ${name}`,
            bal,
            'income',
            wallet.id,
            undefined,
            'Initial Balance'
          );
        }
      }
    }

    // Ensure users table has onboarding_completed column (safe migration for existing DBs)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`);

    // Mark onboarding completed on users table
    await pool.query(`UPDATE users SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);

    return NextResponse.json({ success: true, data: { walletId: createdWalletId } });
  } catch (error) {
    console.error('POST /api/onboarding error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}


