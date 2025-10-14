import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { TransactionDatabase } from '@/lib/database';

// GET - Get all transactions for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Filter by transaction type

    const transactions = await TransactionDatabase.getUserTransactions(user.id, limit, offset);
    
    // Filter by type if specified
    const filteredTransactions = type 
      ? transactions.filter(t => t.type === type)
      : transactions;

    const res = NextResponse.json({
      success: true,
      data: filteredTransactions,
      message: 'Transactions retrieved successfully'
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
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

    if (!description || !amount || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: description, amount, type'
        },
        { status: 400 }
      );
    }

    const transaction = await TransactionDatabase.createTransaction(
      user.id,
      description,
      amount,
      type,
      wallet_id,
      category,
      source,
      goal_name,
      asset_name,
      undefined, // transfer_type
      date ? new Date(date) : new Date()
    );

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/transactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
