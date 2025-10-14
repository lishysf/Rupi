import { NextRequest, NextResponse } from 'next/server';
import { TransactionDatabase, EXPENSE_CATEGORIES } from '@/lib/database';
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

    // Update expense transaction
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, 1000, 0);
    const existingExpense = allTransactions.find(t => t.id === id && t.type === 'expense');
    
    if (!existingExpense) {
      throw new Error('Expense not found');
    }

    // Update the transaction
    const updatedExpense = await TransactionDatabase.updateTransaction(
      user.id,
      id,
      description || existingExpense.description,
      amount || existingExpense.amount,
      'expense',
      existingExpense.wallet_id,
      category || existingExpense.category,
      existingExpense.source,
      existingExpense.goal_name,
      existingExpense.asset_name,
      existingExpense.transfer_type,
      date ? new Date(date) : existingExpense.date
    );

    return NextResponse.json({
      success: true,
      data: updatedExpense,
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

    const success = await TransactionDatabase.deleteTransaction(user.id, id);

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
