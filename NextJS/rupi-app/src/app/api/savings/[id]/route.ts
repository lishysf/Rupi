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

// DELETE - Remove a savings record by ID
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
        { success: false, error: 'Invalid savings ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch the savings record to know amount/goal
      const selectRes = await client.query(
        'SELECT id, amount, goal_name FROM savings WHERE id = $1',
        [id]
      );

      if (selectRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Savings not found' },
          { status: 404 }
        );
      }

      const saving = selectRes.rows[0] as {
        id: number;
        amount: string | number;
        goal_name: string | null;
      };

      const numericAmount = typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount;

      // If it was tied to a goal, reduce the goal's current_amount
      if (saving.goal_name) {
        await client.query(
          'UPDATE savings_goals SET current_amount = GREATEST(current_amount - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE goal_name = $2',
          [numericAmount, saving.goal_name]
        );
      }

      // Delete the savings row
      const deleteRes = await client.query('DELETE FROM savings WHERE id = $1', [id]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: deleteRes.rowCount !== null && deleteRes.rowCount > 0,
        message: 'Savings deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('DELETE /api/savings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update a savings record by ID
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
        { success: false, error: 'Invalid savings ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, amount, goalName } = body as { description?: string; amount?: number; goalName?: string };

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load existing saving for delta adjustments
      const existingRes = await client.query(
        'SELECT id, amount, goal_name FROM savings WHERE id = $1',
        [id]
      );

      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Savings not found' },
          { status: 404 }
        );
      }

      const existing = existingRes.rows[0] as {
        id: number;
        amount: string | number;
        goal_name: string | null;
      };

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(amount);
      }
      if (goalName !== undefined) {
        updates.push(`goal_name = $${paramIndex++}`);
        values.push(goalName);
      }
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updates.length === 1) { // only updated_at
        await client.query('ROLLBACK');
        return NextResponse.json({ success: true, data: existing, message: 'No changes' });
      }

      values.push(id);
      const updateQuery = `UPDATE savings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const updateRes = await client.query(updateQuery, values);

      // Adjust goal if needed when amount changed and is tied to a goal
      if (amount !== undefined && existing.goal_name) {
        const oldAmount = typeof existing.amount === 'string' ? parseFloat(existing.amount) : existing.amount;
        const delta = (amount as number) - oldAmount;
        if (delta !== 0) {
          await client.query(
            'UPDATE savings_goals SET current_amount = GREATEST(current_amount + $1, 0), updated_at = CURRENT_TIMESTAMP WHERE goal_name = $2',
            [delta, existing.goal_name]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, data: updateRes.rows[0], message: 'Savings updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PUT /api/savings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update savings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


