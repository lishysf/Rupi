import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    const { initializeDatabase } = await import('@/lib/database');
    await initializeDatabase();
    dbInitialized = true;
  }
}

// Get daily assets for a date range (calculate on-demand)
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Daily assets API called');
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    console.log('📊 Daily assets request:', { startDate, endDate, userId: user.id });
    
    if (!startDate || !endDate) {
      console.log('❌ Missing start_date or end_date');
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }
    
    // Get existing daily assets from database
    const existingQuery = `
      SELECT 
        date,
        wallet_balance,
        savings_total,
        total_assets
      FROM daily_assets
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC
    `;
    
    const existingResult = await pool.query(existingQuery, [user.id, startDate, endDate]);
    const existingAssets = existingResult.rows;
    
    console.log(`📊 Found ${existingAssets.length} existing daily assets`);
    
    // Calculate missing dates and store them (using same timezone as transactions)
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const missingDates = [];
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Use same date format as transactions (YYYY-MM-DD)
      const dateString = date.toISOString().split('T')[0];
      const exists = existingAssets.find(asset => asset.date === dateString);
      
      if (!exists) {
        missingDates.push(dateString);
      }
    }
    
    console.log(`📊 Missing dates to calculate: ${missingDates.length}`);
    
    // Calculate and store missing daily assets
    for (const dateString of missingDates) {
      console.log(`📊 Calculating and storing assets for date: ${dateString}`);
      
      const dailyAsset = await calculateDailyAssetsForDate(user.id, dateString);
      
      if (dailyAsset) {
        // Store in database
        await pool.query(`
          INSERT INTO daily_assets (user_id, date, wallet_balance, savings_total, total_assets)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, date)
          DO UPDATE SET
            wallet_balance = EXCLUDED.wallet_balance,
            savings_total = EXCLUDED.savings_total,
            total_assets = EXCLUDED.total_assets,
            updated_at = CURRENT_TIMESTAMP
        `, [user.id, dateString, dailyAsset.wallet_balance, dailyAsset.savings_total, dailyAsset.total_assets]);
        
        console.log(`📊 Stored assets for ${dateString}:`, dailyAsset);
      }
    }
    
    // Get all daily assets for the date range (including newly calculated ones)
    const finalResult = await pool.query(existingQuery, [user.id, startDate, endDate]);
    const allAssets = finalResult.rows;
    
    console.log(`📊 Returning ${allAssets.length} daily assets`);
    
    return NextResponse.json({
      success: true,
      data: allAssets
    });
    
  } catch (error) {
    console.error('❌ Error fetching daily assets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily assets' },
      { status: 500 }
    );
  }
}

// Helper function to calculate daily assets for a specific date
async function calculateDailyAssetsForDate(userId: number, date: string) {
  try {
    console.log(`📊 Calculating assets for user ${userId} on ${date}`);
    
    // Get current wallet balances (same as Financial Overview)
    const walletsResult = await pool.query(`
      SELECT id, balance
      FROM user_wallets
      WHERE user_id = $1 AND is_active = true
    `, [userId]);
    
    const wallets = walletsResult.rows;
    console.log(`📊 Found ${wallets.length} wallets for user ${userId}`);
    
    // Calculate total wallet balance (same as Financial Overview)
    const totalWalletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    console.log(`📊 Total wallet balance: ${totalWalletBalance}`);
    
    // Calculate total savings from transactions up to this date
    const savingsResult = await pool.query(`
      SELECT SUM(amount) as total_savings
      FROM transactions
      WHERE user_id = $1 AND type = 'savings' AND DATE(date) <= $2
    `, [userId, date]);
    
    const totalSavings = parseFloat(savingsResult.rows[0]?.total_savings || '0');
    console.log(`📊 Total savings: ${totalSavings}`);
    
    // Calculate total assets (same as Financial Overview: wallet balance + savings)
    const totalAssets = totalWalletBalance + totalSavings;
    console.log(`📊 Total assets: ${totalAssets} (wallet: ${totalWalletBalance} + savings: ${totalSavings})`);
    
    return {
      wallet_balance: totalWalletBalance,
      savings_total: totalSavings,
      total_assets: totalAssets
    };
  } catch (error) {
    console.error('❌ Error calculating daily assets for date:', error);
    return null;
  }
}

// Create or update daily asset snapshot
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const body = await request.json();
    const { date, wallet_balance, savings_total, total_assets } = body;
    
    if (!date || wallet_balance === undefined || savings_total === undefined || total_assets === undefined) {
      return NextResponse.json(
        { success: false, error: 'date, wallet_balance, savings_total, and total_assets are required' },
        { status: 400 }
      );
    }
    
    // Upsert daily asset snapshot
    const query = `
      INSERT INTO daily_assets (user_id, date, wallet_balance, savings_total, total_assets)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        wallet_balance = EXCLUDED.wallet_balance,
        savings_total = EXCLUDED.savings_total,
        total_assets = EXCLUDED.total_assets,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await pool.query(query, [user.id, date, wallet_balance, savings_total, total_assets]);
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating/updating daily asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/update daily asset' },
      { status: 500 }
    );
  }
}
