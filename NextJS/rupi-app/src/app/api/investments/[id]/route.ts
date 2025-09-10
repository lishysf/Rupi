import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { initializeDatabase } from '@/lib/database';

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    const body = await request.json();
    const { description, amount, assetName } = body as { description?: string; amount?: number; assetName?: string };
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
    if (amount !== undefined) { 
      if (typeof amount !== 'number' || amount <= 0) return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
      updates.push(`amount = $${i++}`); values.push(amount);
    }
    if (assetName !== undefined) { updates.push(`asset_name = $${i++}`); values.push(assetName); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query(`UPDATE investments SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('PUT /api/investments/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update investment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    const res = await pool.query('DELETE FROM investments WHERE id = $1', [id]);
    return NextResponse.json({ success: res.rowCount !== null && res.rowCount > 0 });
  } catch (error) {
    console.error('DELETE /api/investments/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete investment' }, { status: 500 });
  }
}


