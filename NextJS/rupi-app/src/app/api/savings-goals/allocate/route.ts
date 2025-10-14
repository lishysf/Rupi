import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { initializeDatabase, pool } from '@/lib/database';

let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// POST - Allocate savings from specific wallets to goals
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    const body = await request.json();
    const { allocations } = body;

    console.log('Allocation request:', { userId: user.id, allocations });

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

    // Process each allocation - just update goal_name field of existing savings
    for (const allocation of allocations) {
      const { goalId, walletId, amount } = allocation;

      console.log('Processing allocation:', { goalId, walletId, amount });

      if (amount <= 0) continue; // Skip zero or negative amounts

      // Verify goal belongs to user
      const goalCheck = await pool.query(
        'SELECT id, goal_name FROM savings_goals WHERE id = $1 AND user_id = $2',
        [goalId, user.id]
      );

      if (goalCheck.rows.length === 0) {
        throw new Error(`Goal ${goalId} not found`);
      }

      // Verify wallet belongs to user
      const walletCheck = await pool.query(
        'SELECT id, name FROM user_wallets WHERE id = $1 AND user_id = $2',
        [walletId, user.id]
      );

      if (walletCheck.rows.length === 0) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      const goal = goalCheck.rows[0];
      const wallet = walletCheck.rows[0];

      // Get total savings from wallet (for validation)
      const totalSavingsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_savings
        FROM transactions 
        WHERE user_id = $1 AND wallet_id = $2 AND type = 'savings' AND amount > 0
      `;
      const totalSavingsResult = await pool.query(totalSavingsQuery, [user.id, walletId]);
      const totalSavings = parseFloat(totalSavingsResult.rows[0].total_savings) || 0;

      // Check if goal already has allocated amount
      const currentAllocatedQuery = `
        SELECT COALESCE(allocated_amount, 0) as allocated_amount
        FROM savings_goals 
        WHERE id = $1 AND user_id = $2
      `;
      const currentAllocatedResult = await pool.query(currentAllocatedQuery, [goalId, user.id]);
      const currentAllocated = parseFloat(currentAllocatedResult.rows[0].allocated_amount) || 0;

      // Calculate remaining target amount
      const remainingTarget = Math.max(0, goal.target_amount - currentAllocated);

      console.log('Allocation validation:', { 
        walletName: wallet.name, 
        totalSavings, 
        requiredAmount: amount,
        currentAllocated,
        targetAmount: goal.target_amount,
        remainingTarget
      });

      if (totalSavings < amount) {
        throw new Error(`Insufficient savings in ${wallet.name}. Total savings: ${totalSavings}, Required: ${amount}`);
      }

      if (amount > remainingTarget) {
        throw new Error(`Cannot allocate more than remaining target. Remaining target: ${remainingTarget}, Trying to allocate: ${amount}`);
      }

      // Just update the savings_goals table with allocation info
      // This is just virtual tracking, not real transactions
      await pool.query(
        'UPDATE savings_goals SET allocated_amount = COALESCE(allocated_amount, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [amount, goalId]
      );

      console.log('Updated goal allocation:', { goalName: goal.goal_name, amount });
    }

    return NextResponse.json({
      success: true,
      message: 'Savings allocations updated successfully'
    });

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
