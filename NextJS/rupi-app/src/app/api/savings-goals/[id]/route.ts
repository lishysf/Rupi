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

// PUT - Update savings goal by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid savings goal ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, targetAmount, deadline, icon, color, currentAmount } = body;

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

    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Current amount must be a non-negative number'
          },
          { status: 400 }
        );
      }
      paramCount++;
      updates.push(`current_amount = $${paramCount}`);
      queryParams.push(currentAmount);
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
    console.error('PUT /api/savings-goals/[id] error:', error);
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

// DELETE - Delete savings goal by ID
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid savings goal ID' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the goal name first
      const goalResult = await client.query('SELECT goal_name FROM savings_goals WHERE id = $1', [id]);
      
      if (goalResult.rows.length > 0) {
        const goalName = goalResult.rows[0].goal_name;
        // Delete associated savings records
        await client.query('DELETE FROM savings WHERE goal_name = $1', [goalName]);
      }

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
    console.error('DELETE /api/savings-goals/[id] error:', error);
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
