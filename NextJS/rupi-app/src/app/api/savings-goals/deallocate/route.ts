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

// POST - Deallocate money from goals
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    const body = await request.json();
    const { goalId, amount } = body;

    console.log('Deallocation request:', { userId: user.id, goalId, amount });

    if (!goalId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid goalId or amount' },
        { status: 400 }
      );
    }

    // Verify goal belongs to user and get current allocated amount
    const goalCheck = await pool.query(
      'SELECT id, goal_name, allocated_amount FROM savings_goals WHERE id = $1 AND user_id = $2',
      [goalId, user.id]
    );

    if (goalCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    const goal = goalCheck.rows[0];
    const currentAllocated = parseFloat(goal.allocated_amount) || 0;

    if (currentAllocated < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot deallocate more than allocated amount. Current allocation: Rp${currentAllocated.toLocaleString()}, Requested: Rp${amount.toLocaleString()}`
        },
        { status: 400 }
      );
    }

    // Update the goal's allocated amount
    await pool.query(
      'UPDATE savings_goals SET allocated_amount = allocated_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, goalId]
    );

    console.log('Deallocated successfully:', { goalName: goal.goal_name, amount });

    return NextResponse.json({
      success: true,
      message: `Successfully deallocated Rp${amount.toLocaleString()} from ${goal.goal_name}`,
      data: {
        goalId,
        goalName: goal.goal_name,
        deallocatedAmount: amount,
        previousAllocation: currentAllocated,
        newAllocation: currentAllocated - amount
      }
    });

  } catch (error) {
    console.error('POST /api/savings-goals/deallocate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deallocate savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

