import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { SavingsGoalDatabase } from '@/lib/database';

// GET - Get specific savings goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const goalId = parseInt(id);

    if (isNaN(goalId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid savings goal ID'
        },
        { status: 400 }
      );
    }

    const goals = await SavingsGoalDatabase.getAllSavingsGoals(user.id);
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Savings goal not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: goal,
      message: 'Savings goal retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/savings-goals/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update savings goal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const goalId = parseInt(id);
    const body = await request.json();

    if (isNaN(goalId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid savings goal ID'
        },
        { status: 400 }
      );
    }

    const { goal_name, target_amount, target_date } = body;

    const updatedGoal = await SavingsGoalDatabase.updateSavingsGoal(
      user.id,
      goalId,
      goal_name,
      target_amount,
      undefined, // currentAmount - not used in optimized system
      target_date ? new Date(target_date) : undefined
    );

    return NextResponse.json({
      success: true,
      data: updatedGoal,
      message: 'Savings goal updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/savings-goals/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete savings goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const goalId = parseInt(id);

    if (isNaN(goalId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid savings goal ID'
        },
        { status: 400 }
      );
    }

    const success = await SavingsGoalDatabase.deleteSavingsGoal(user.id, goalId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Savings goal not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Savings goal deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/savings-goals/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}