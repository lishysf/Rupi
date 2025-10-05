import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { initializeDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

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
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM investments WHERE user_id = $1`;
    const params: any[] = [user.id];
    let pc = 1;
    query += ' ORDER BY date DESC, created_at DESC';
    if (limit > 0) {
      pc++; query += ` LIMIT $${pc}`; params.push(limit);
    }
    if (offset > 0) {
      pc++; query += ` OFFSET $${pc}`; params.push(offset);
    }
    const result = await pool.query(query, params);
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      message: 'Investments retrieved successfully'
    });
  } catch (error) {
    console.error('GET /api/investments error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve investments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const body = await request.json();
    const { description, amount, assetName, date } = body;
    
    // Validate required fields
    if (!description || !amount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: description, amount' 
      }, { status: 400 });
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Amount must be a positive number' 
      }, { status: 400 });
    }

    // First, delete all existing investments for this user
    await pool.query(
      'DELETE FROM investments WHERE user_id = $1',
      [user.id]
    );
    
    // Then insert the new investment value
    const result = await pool.query(
      `INSERT INTO investments (user_id, description, amount, asset_name, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, description, amount, assetName || null, date ? new Date(date) : new Date()]
    );
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Investment portfolio value updated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/investments error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update investment portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}