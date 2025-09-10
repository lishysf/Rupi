import { NextRequest, NextResponse } from 'next/server';
import { ExpenseDatabase, EXPENSE_CATEGORIES } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// PUT - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid expense ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, amount, category, date } = body;

    // Validate amount if provided
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be a positive number'
        },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Update expense
    const expense = await ExpenseDatabase.updateExpense(
      user.id,
      id,
      description,
      amount,
      category,
      date ? new Date(date) : undefined
    );

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    
    if (error instanceof Error && error.message === 'Expense not found') {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid expense ID'
        },
        { status: 400 }
      );
    }

    const success = await ExpenseDatabase.deleteExpense(user.id, id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
