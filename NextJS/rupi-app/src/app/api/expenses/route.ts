import { NextRequest, NextResponse } from 'next/server';
import { ExpenseDatabase, IncomeDatabase, SavingsDatabase, UserWalletDatabase, initializeDatabase, EXPENSE_CATEGORIES } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// GET - Fetch expenses
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const summary = searchParams.get('summary') === 'true';

    let expenses;

    if (summary) {
      // Return expense summary by category
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      expenses = await ExpenseDatabase.getExpenseSummaryByCategory(user.id, start, end);
    } else if (category && EXPENSE_CATEGORIES.includes(category as any)) {
      // Filter by category
      expenses = await ExpenseDatabase.getExpensesByCategory(user.id, category as any);
    } else if (startDate && endDate) {
      // Filter by date range
      expenses = await ExpenseDatabase.getExpensesByDateRange(
        user.id,
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      // Get all expenses with pagination
      expenses = await ExpenseDatabase.getAllExpenses(user.id, limit, offset);
    }

    return NextResponse.json({
      success: true,
      data: expenses,
      message: 'Expenses retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { description, amount, category, date, walletId } = body;

    // Validate required fields
    if (!description || !amount || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: description, amount, category'
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

    // Validate category
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Handle wallet selection for expense
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
      
      // Check if wallet balance is sufficient for expense (calculated from transactions)
      const currentBalance = await UserWalletDatabase.calculateWalletBalance(user.id, walletId);
      if (currentBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient balance in ${selectedWallet.name}. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`
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
          error: 'Please select a wallet for this expense. You must specify which wallet to use for all transactions.'
        },
        { status: 400 }
      );
    }

    // Create expense with wallet ID
    const expense = await ExpenseDatabase.createExpense(
      user.id,
      description,
      amount,
      category,
      date ? new Date(date) : undefined,
      selectedWalletId
    );

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
