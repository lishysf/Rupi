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

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM investments`;
    const params: any[] = [];
    let pc = 0;
    query += ' ORDER BY date DESC, created_at DESC';
    if (limit > 0) {
      pc++; query += ` LIMIT $${pc}`; params.push(limit);
    }
    if (offset > 0) {
      pc++; query += ` OFFSET $${pc}`; params.push(offset);
    }
    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/investments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve investments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { description, amount, assetName } = body;
    if (!description || !amount) {
      return NextResponse.json({ success: false, error: 'Missing description or amount' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
    }
    const result = await pool.query(
      `INSERT INTO investments (description, amount, asset_name, date)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
      [description, amount, assetName || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/investments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create investment' }, { status: 500 });
  }
}


