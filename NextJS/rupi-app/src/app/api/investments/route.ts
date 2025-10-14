import { NextRequest, NextResponse } from 'next/server';
// import { Pool } from 'pg'; // Removed unused import
import { TransactionDatabase, initializeDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// const pool = new Pool({ // Removed unused pool
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432'),
//   database: process.env.DB_NAME || 'rupi_db',
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD || 'password',
// });

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

    // Get investments from unified transactions table
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, limit, offset);
    const investments = allTransactions.filter(t => t.type === 'investment');
    
    return NextResponse.json({ 
      success: true, 
      data: investments,
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

    // Create investment using unified TransactionDatabase
    const investment = await TransactionDatabase.createTransaction(
      user.id,
      description,
      amount,
      'investment',
      undefined, // No wallet for investments
      undefined,
      undefined,
      undefined,
      assetName,
      undefined,
      date ? new Date(date) : new Date()
    );
    
    return NextResponse.json({ 
      success: true, 
      data: investment,
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