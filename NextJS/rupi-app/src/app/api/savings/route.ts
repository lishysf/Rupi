import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { TransactionDatabase, UserWalletDatabase, initializeDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// GET - Fetch savings
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get savings from unified transactions table
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, limit, offset);
    let savings = allTransactions.filter(t => t.type === 'savings');
    
    // Apply filters
    if (goalId) {
      // Get goal name from goalId
      const goalResult = await pool.query('SELECT goal_name FROM savings_goals WHERE id = $1 AND user_id = $2', [parseInt(goalId), user.id]);
      if (goalResult.rows.length > 0) {
        const goalName = goalResult.rows[0].goal_name;
        savings = savings.filter(s => s.goal_name === goalName);
      }
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      savings = savings.filter(s => s.date >= start && s.date <= end);
    }

    return NextResponse.json({
      success: true,
      data: savings,
      message: 'Savings retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/savings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new savings deposit
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { description, amount, goalId, goalName, type = 'deposit', walletId } = body;

    // Validate required fields
    if (!description || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: description, amount'
        },
        { status: 400 }
      );
    }

    // Validate wallet requirement for deposits
    if (type === 'deposit' && !walletId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet is required for savings deposits. Please specify which wallet to transfer from.'
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

    // Validate type
    const validTypes = ['deposit', 'withdrawal', 'transfer'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Handle wallet validation and balance checks
    if (type === 'deposit' || type === 'transfer') {
      // Verify wallet exists and has sufficient balance
      const wallets = await UserWalletDatabase.getAllWallets(user.id);
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        return NextResponse.json(
          {
            success: false,
            error: 'Specified wallet not found'
          },
          { status: 400 }
        );
      }
      
      const currentBalance = await UserWalletDatabase.calculateWalletBalance(user.id, walletId);
      
      if (currentBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient balance in ${wallet.name}. Current balance: Rp${currentBalance.toLocaleString()}, Required: Rp${amount.toLocaleString()}`
          },
          { status: 400 }
        );
      }
    } else if (type === 'withdrawal') {
      // For withdrawals, check if savings balance is sufficient
      const allSavings = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total_savings FROM transactions WHERE user_id = $1 AND type = $2',
        [user.id, 'savings']
      );
      const totalSavings = parseFloat(allSavings.rows[0].total_savings);
      
      if (totalSavings < amount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient savings balance. Current savings: Rp${totalSavings.toLocaleString()}, Required: Rp${amount.toLocaleString()}`
          },
          { status: 400 }
        );
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create savings transaction using unified system
      const { TransactionDatabase } = await import('@/lib/database');
      const savingsResult = await TransactionDatabase.createTransaction(
        user.id,
        description,
        type === 'withdrawal' ? -amount : amount, // Negative for withdrawals
        'savings',
        type === 'deposit' ? walletId : undefined, // Only set wallet_id for deposits
        undefined, // category
        undefined, // subcategory
        goalName,
        undefined, // asset_name
        new Date()
      );

      // For withdrawals, create a corresponding transfer transaction to the wallet
      if (type === 'withdrawal' && walletId) {
        await TransactionDatabase.createTransaction(
          user.id,
          `Transfer from savings: ${description}`,
          amount, // Positive amount for the wallet
          'transfer',
          walletId,
          'Transfer', // category
          undefined, // subcategory
          undefined, // goal_name
          undefined, // asset_name
          new Date()
        );
      }

      // Update goal's current amount based on transaction type
      if (goalName) {
        const goalAmountChange = type === 'withdrawal' ? -amount : amount;
        const updateGoalQuery = `
          UPDATE savings_goals 
          SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP
          WHERE goal_name = $2 AND user_id = $3
        `;
        await client.query(updateGoalQuery, [goalAmountChange, goalName, user.id]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: savingsResult,
        message: 'Savings recorded successfully'
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('POST /api/savings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
