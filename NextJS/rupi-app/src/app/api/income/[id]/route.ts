import { NextRequest, NextResponse } from 'next/server';
import { TransactionDatabase, INCOME_SOURCES } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// PUT - Update income
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
          error: 'Invalid income ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, amount, source, date } = body;

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

    // Validate source if provided
    if (source !== undefined && !INCOME_SOURCES.includes(source)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid source. Must be one of: ${INCOME_SOURCES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Update income transaction
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, 1000, 0);
    const existingIncome = allTransactions.find(t => t.id === id && t.type === 'income');
    
    if (!existingIncome) {
      throw new Error('Income not found');
    }

    // Update the transaction
    const updatedIncome = await TransactionDatabase.updateTransaction(
      user.id,
      id,
      description || existingIncome.description,
      amount || existingIncome.amount,
      'income',
      existingIncome.wallet_id,
      existingIncome.category,
      source || existingIncome.source,
      existingIncome.goal_name,
      existingIncome.asset_name,
      existingIncome.transfer_type,
      date ? new Date(date) : existingIncome.date
    );

    return NextResponse.json({
      success: true,
      data: updatedIncome,
      message: 'Income updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/income/[id] error:', error);
    
    if (error instanceof Error && error.message === 'Income not found') {
      return NextResponse.json(
        {
          success: false,
          error: 'Income not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete income
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
          error: 'Invalid income ID'
        },
        { status: 400 }
      );
    }

    const success = await TransactionDatabase.deleteTransaction(user.id, id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Income not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Income deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/income/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
