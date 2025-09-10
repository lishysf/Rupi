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

// GET - Fetch savings goals
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active') === 'true';

    let query = 'SELECT * FROM savings_goals';
    const queryParams: any[] = [];

    if (active) {
      query += ' WHERE current_amount < target_amount';
    }

    query += ' ORDER BY deadline ASC, created_at DESC';

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      message: 'Savings goals retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve savings goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new savings goal
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { name, targetAmount, deadline, icon, color } = body;

    // Validate required fields
    if (!name || !targetAmount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, targetAmount'
        },
        { status: 400 }
      );
    }

    // Validate target amount
    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Target amount must be a positive number'
        },
        { status: 400 }
      );
    }

    // Validate deadline if provided
    if (deadline && new Date(deadline) <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Deadline must be in the future'
        },
        { status: 400 }
      );
    }

    // Create savings goal
    const query = `
      INSERT INTO savings_goals (name, target_amount, deadline, icon, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      targetAmount,
      deadline ? new Date(deadline) : null,
      icon || null,
      color || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Savings goal created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update savings goal
export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { id, name, targetAmount, deadline, icon, color } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id'
        },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      queryParams.push(name);
    }

    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Target amount must be a positive number'
          },
          { status: 400 }
        );
      }
      paramCount++;
      updates.push(`target_amount = $${paramCount}`);
      queryParams.push(targetAmount);
    }

    if (deadline !== undefined) {
      if (deadline && new Date(deadline) <= new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Deadline must be in the future'
          },
          { status: 400 }
        );
      }
      paramCount++;
      updates.push(`deadline = $${paramCount}`);
      queryParams.push(deadline ? new Date(deadline) : null);
    }

    if (icon !== undefined) {
      paramCount++;
      updates.push(`icon = $${paramCount}`);
      queryParams.push(icon);
    }

    if (color !== undefined) {
      paramCount++;
      updates.push(`color = $${paramCount}`);
      queryParams.push(color);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update'
        },
        { status: 400 }
      );
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(id);

    const query = `
      UPDATE savings_goals 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Savings goal not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Savings goal updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete savings goal
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: id'
        },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete associated savings records
      await client.query('DELETE FROM savings WHERE goal_id = $1', [id]);

      // Delete the goal
      const result = await client.query('DELETE FROM savings_goals WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          {
            success: false,
            error: 'Savings goal not found'
          },
          { status: 404 }
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Savings goal deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('DELETE /api/savings-goals error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete savings goal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
