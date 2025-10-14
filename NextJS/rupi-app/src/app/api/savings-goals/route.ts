import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { SavingsGoalDatabase } from '@/lib/database';

// GET - Get savings goals for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const goals = await SavingsGoalDatabase.getAllSavingsGoals(user.id);

    return NextResponse.json({
      success: true,
      data: goals,
      message: 'Savings goals retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve savings goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new savings goal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const { goal_name, target_amount, target_date, name, targetAmount, targetDate } = body;

    // Support both field naming conventions
    const finalGoalName = goal_name || name;
    const finalTargetAmount = target_amount || targetAmount;
    const finalTargetDate = target_date || targetDate;

    if (!finalGoalName || !finalTargetAmount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: goal_name (or name), target_amount (or targetAmount)'
        },
        { status: 400 }
      );
    }

    const goal = await SavingsGoalDatabase.createSavingsGoal(
      user.id, 
      finalGoalName, 
      finalTargetAmount, 
      finalTargetDate ? new Date(finalTargetDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: goal,
      message: 'Savings goal created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}