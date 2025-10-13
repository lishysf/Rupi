import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth-utils';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// GET - Get savings data for a specific wallet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet ID' },
        { status: 400 }
      );
    }

    // Verify wallet belongs to user
    const walletCheck = await pool.query(
      'SELECT id FROM user_wallets WHERE id = $1 AND user_id = $2',
      [walletId, user.id]
    );

    if (walletCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Get total savings from this wallet
    const savingsQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_savings,
        COUNT(*) as savings_count
      FROM savings 
      WHERE user_id = $1 AND wallet_id = $2 AND amount > 0
    `;

    const savingsResult = await pool.query(savingsQuery, [user.id, walletId]);

    // Get savings by goal for this wallet
    const savingsByGoalQuery = `
      SELECT 
        s.goal_name,
        COALESCE(SUM(s.amount), 0) as total_amount,
        COUNT(*) as transaction_count
      FROM savings s
      WHERE s.user_id = $1 AND s.wallet_id = $2 AND s.amount > 0
      GROUP BY s.goal_name
      ORDER BY total_amount DESC
    `;

    const savingsByGoalResult = await pool.query(savingsByGoalQuery, [user.id, walletId]);

    // Get recent savings transactions from this wallet
    const recentSavingsQuery = `
      SELECT 
        s.id,
        s.description,
        s.amount,
        s.goal_name,
        s.date,
        s.created_at
      FROM savings s
      WHERE s.user_id = $1 AND s.wallet_id = $2
      ORDER BY s.date DESC, s.created_at DESC
      LIMIT 10
    `;

    const recentSavingsResult = await pool.query(recentSavingsQuery, [user.id, walletId]);

    return NextResponse.json({
      success: true,
      data: {
        walletId,
        totalSavings: parseFloat(savingsResult.rows[0].total_savings) || 0,
        savingsCount: parseInt(savingsResult.rows[0].savings_count) || 0,
        savingsByGoal: savingsByGoalResult.rows.map((row: any) => ({
          goalName: row.goal_name,
          totalAmount: parseFloat(row.total_amount) || 0,
          transactionCount: parseInt(row.transaction_count) || 0
        })),
        recentSavings: recentSavingsResult.rows.map((row: any) => ({
          id: row.id,
          description: row.description,
          amount: parseFloat(row.amount) || 0,
          goalName: row.goal_name,
          date: row.date,
          createdAt: row.created_at
        }))
      }
    });

  } catch (error) {
    console.error('GET /api/wallets/[id]/savings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet savings data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
