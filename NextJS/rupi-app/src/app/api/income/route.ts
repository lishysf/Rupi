import { NextRequest, NextResponse } from 'next/server';
import { TransactionDatabase, UserWalletDatabase, initializeDatabase, INCOME_SOURCES } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// GET - Fetch income
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    // const summary = searchParams.get('summary') === 'true'; // Removed unused variable

    let income;

    // Get income from unified transactions table
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, limit, offset);
    income = allTransactions.filter(t => t.type === 'income');
    
    // Apply filters
    if (source) {
      income = income.filter(i => i.source === source);
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      income = income.filter(i => i.date >= start && i.date <= end);
    }

    return NextResponse.json({
      success: true,
      data: income,
      message: 'Income retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/income error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new income
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { description, amount, source, date, walletId } = body;

    // Validate required fields
    if (!description || !amount || !source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: description, amount, source'
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be a positive number'
        },
        { status: 400 }
      );
    }

    // Validate source
    if (!INCOME_SOURCES.includes(source)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid source. Must be one of: ${INCOME_SOURCES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Handle wallet selection for income
    let selectedWalletId: number;
    
    if (walletId) {
      // User selected a specific wallet
      const wallets = await UserWalletDatabase.getAllWallets(user.id);
      const selectedWallet = wallets.find(w => w.id === walletId);
      
      if (!selectedWallet) {
        return NextResponse.json(
          {
            success: false,
            error: 'Selected wallet not found'
          },
          { status: 400 }
        );
      }
      
      selectedWalletId = walletId;
    } else {
      // No wallet selected - require wallet selection
      return NextResponse.json(
        {
          success: false,
          error: 'Please select a wallet for this income. You must specify which wallet to receive all income.'
        },
        { status: 400 }
      );
    }

    // Create income with wallet ID
    const income = await TransactionDatabase.createTransaction(
      user.id,
      description,
      amount,
      'income',
      selectedWalletId,
      undefined,
      source,
      undefined,
      undefined,
      undefined,
      date ? new Date(date) : undefined
    );

    return NextResponse.json({
      success: true,
      data: income,
      message: 'Income created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/income error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
