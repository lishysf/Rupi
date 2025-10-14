import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { BudgetDatabase } from '@/lib/database';

// GET - Get budgets for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    let budgets;
    if (month && year) {
      budgets = await BudgetDatabase.getAllBudgets(user.id, month, year);
    } else {
      budgets = await BudgetDatabase.getAllBudgets(user.id);
    }

    return NextResponse.json({
      success: true,
      data: budgets,
      message: 'Budgets retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve budgets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new budget
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const { category, amount, month, year } = body;

    if (!category || !amount || !month || !year) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: category, amount, month, year'
        },
        { status: 400 }
      );
    }

    const budget = await BudgetDatabase.createOrUpdateBudget(user.id, category, amount, month, year);

    return NextResponse.json({
      success: true,
      data: budget,
      message: 'Budget created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete budget
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!category || !month || !year) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: category, month, year'
        },
        { status: 400 }
      );
    }

    const success = await BudgetDatabase.deleteBudget(user.id, category, month, year);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Budget not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}