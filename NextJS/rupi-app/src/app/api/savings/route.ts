import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { initializeDatabase, UserWalletDatabase } from '@/lib/database';
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

    let query = `
      SELECT s.*, sg.goal_name as goal_name 
      FROM savings s 
      LEFT JOIN savings_goals sg ON s.goal_name = sg.goal_name
      WHERE s.user_id = $1
    `;
    const queryParams: any[] = [user.id];
    let paramCount = 1;

    const conditions: string[] = [];

    if (goalId) {
      paramCount++;
      conditions.push(`s.goal_name = (SELECT goal_name FROM savings_goals WHERE id = $${paramCount})`);
      queryParams.push(parseInt(goalId));
    }

    if (startDate && endDate) {
      paramCount++;
      conditions.push(`s.date >= $${paramCount}`);
      queryParams.push(new Date(startDate));
      
      paramCount++;
      conditions.push(`s.date <= $${paramCount}`);
      queryParams.push(new Date(endDate));
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY s.date DESC, s.created_at DESC`;

    if (limit > 0) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limit);
    }

    if (offset > 0) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);
    }

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
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
        'SELECT COALESCE(SUM(amount), 0) as total_savings FROM savings WHERE user_id = $1',
        [user.id]
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

      // Insert savings record (use negative amount for withdrawals)
      const finalAmount = type === 'withdrawal' ? -amount : amount;
      const savingsQuery = `
        INSERT INTO savings (user_id, description, amount, goal_name, wallet_id, date)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const savingsResult = await client.query(savingsQuery, [
        user.id,
        description,
        finalAmount,
        goalName || null,
        walletId || null
      ]);

      // Create wallet transfer record for deposits (NOT an expense - just money movement)
      if (type === 'deposit' || type === 'transfer') {
        const { WalletTransferDatabase } = await import('@/lib/database');
        await WalletTransferDatabase.createTransfer(
          user.id,
          walletId, // from wallet
          undefined, // to wallet (none, going to savings)
          true, // to savings
          amount,
          `Savings: ${description}`,
          'wallet_to_savings'
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
        data: savingsResult.rows[0],
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
