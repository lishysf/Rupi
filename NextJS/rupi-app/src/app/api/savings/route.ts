import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { initializeDatabase } from '@/lib/database';

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
    
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT s.*, sg.name as goal_name 
      FROM savings s 
      LEFT JOIN savings_goals sg ON s.goal_id = sg.id
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    const conditions: string[] = [];

    if (goalId) {
      paramCount++;
      conditions.push(`s.goal_id = $${paramCount}`);
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
      query += ` WHERE ${conditions.join(' AND ')}`;
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

    const body = await request.json();
    const { description, amount, goalId, goalName, type = 'deposit' } = body;

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

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert savings record
      const savingsQuery = `
        INSERT INTO savings (description, amount, goal_id, goal_name, type, date)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const savingsResult = await client.query(savingsQuery, [
        description,
        amount,
        goalId || null,
        goalName || null,
        type
      ]);

      // If this is a deposit and has a goal, update the goal's current amount
      if (type === 'deposit' && goalId) {
        const updateGoalQuery = `
          UPDATE savings_goals 
          SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        await client.query(updateGoalQuery, [amount, goalId]);
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
