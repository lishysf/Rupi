import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { TransactionDatabase } from '@/lib/database';

// GET - Get specific transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction ID'
        },
        { status: 400 }
      );
    }

    // Get all user transactions and find the specific one
    const transactions = await TransactionDatabase.getUserTransactions(user.id);
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found'
        },
        { status: 404 }
      );
    }

    const res = NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction retrieved successfully'
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('GET /api/transactions/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const transactionId = parseInt(id);
    const body = await request.json();

    if (isNaN(transactionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction ID'
        },
        { status: 400 }
      );
    }

    const { 
      description, 
      amount, 
      type, 
      category, 
      source, 
      wallet_id, 
      goal_name, 
      asset_name, 
      date 
    } = body;

    // Update the transaction using the new updateTransaction method
    const updatedTransaction = await TransactionDatabase.updateTransaction(
      user.id,
      transactionId,
      description,
      amount,
      type,
      wallet_id,
      category,
      source,
      goal_name,
      asset_name,
      undefined, // transfer_type
      date ? new Date(date) : undefined
    );

    const res = NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('PUT /api/transactions/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction ID'
        },
        { status: 400 }
      );
    }

    // Delete the transaction using the new deleteTransaction method
    const deleted = await TransactionDatabase.deleteTransaction(user.id, transactionId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found or access denied'
        },
        { status: 404 }
      );
    }

    const res = NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('DELETE /api/transactions/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
