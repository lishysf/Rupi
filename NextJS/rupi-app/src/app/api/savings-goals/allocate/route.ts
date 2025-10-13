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

// POST - Allocate savings from specific wallets to goals
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { allocations } = body;

    if (!allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { success: false, error: 'Invalid allocations data' },
        { status: 400 }
      );
    }

    // Validate allocations structure
    for (const allocation of allocations) {
      if (!allocation.goalId || !allocation.walletId || typeof allocation.amount !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Invalid allocation structure' },
          { status: 400 }
        );
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Process each allocation
      for (const allocation of allocations) {
        const { goalId, walletId, amount } = allocation;

        if (amount <= 0) continue; // Skip zero or negative amounts

        // Verify goal belongs to user
        const goalCheck = await client.query(
          'SELECT id, goal_name FROM savings_goals WHERE id = $1 AND user_id = $2',
          [goalId, user.id]
        );

        if (goalCheck.rows.length === 0) {
          throw new Error(`Goal ${goalId} not found`);
        }

        // Verify wallet belongs to user
        const walletCheck = await client.query(
          'SELECT id, name FROM user_wallets WHERE id = $1 AND user_id = $2',
          [walletId, user.id]
        );

        if (walletCheck.rows.length === 0) {
          throw new Error(`Wallet ${walletId} not found`);
        }

        const goal = goalCheck.rows[0];
        const wallet = walletCheck.rows[0];

        // Check if wallet has sufficient savings
        const walletSavingsQuery = `
          SELECT COALESCE(SUM(amount), 0) as total_savings
          FROM savings 
          WHERE user_id = $1 AND wallet_id = $2 AND amount > 0
        `;
        const walletSavingsResult = await client.query(walletSavingsQuery, [user.id, walletId]);
        const availableSavings = parseFloat(walletSavingsResult.rows[0].total_savings) || 0;

        if (availableSavings < amount) {
          throw new Error(`Insufficient savings in ${wallet.name}. Available: ${availableSavings}, Required: ${amount}`);
        }

        // Create savings allocation record
        const allocationQuery = `
          INSERT INTO savings (user_id, description, amount, goal_name, wallet_id, date)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        const allocationResult = await client.query(allocationQuery, [
          user.id,
          `Allocation to ${goal.goal_name}`,
          amount,
          goal.goal_name,
          walletId
        ]);

        // Update goal's current amount
        const updateGoalQuery = `
          UPDATE savings_goals 
          SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND user_id = $3
        `;
        await client.query(updateGoalQuery, [amount, goalId, user.id]);

        // Create wallet transfer record
        const { WalletTransferDatabase } = await import('@/lib/database');
        await WalletTransferDatabase.createTransfer(
          user.id,
          walletId, // from wallet
          undefined, // to wallet (none, going to savings)
          true, // to savings
          amount,
          `Savings allocation to ${goal.goal_name}`,
          'wallet_to_savings'
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Savings allocations updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('POST /api/savings-goals/allocate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to allocate savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
