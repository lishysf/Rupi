import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { TransactionDatabase, initializeDatabase } from '@/lib/database';
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid ID' 
      }, { status: 400 });
    }
    
    // First check if the investment exists and belongs to the user
    // Get investment from unified transactions table
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id);
    const existingInvestment = allTransactions.find(t => t.id === id && t.type === 'investment');
    
    if (!existingInvestment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Investment not found or access denied' 
      }, { status: 404 });
    }
    
    const body = await request.json();
    const { description, amount, assetName, date } = body as { 
      description?: string; 
      amount?: number; 
      assetName?: string;
      date?: string;
    };
    
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    
    if (description !== undefined) { 
      updates.push(`description = $${i++}`); 
      values.push(description); 
    }
    if (amount !== undefined) { 
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Amount must be a positive number' 
        }, { status: 400 });
      }
      updates.push(`amount = $${i++}`); 
      values.push(amount);
    }
    if (assetName !== undefined) { 
      updates.push(`asset_name = $${i++}`); 
      values.push(assetName); 
    }
    if (date !== undefined) {
      updates.push(`date = $${i++}`);
      values.push(new Date(date));
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    values.push(user.id);
    
    const result = await pool.query(
      `UPDATE investments SET ${updates.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`, 
      values
    );
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Investment updated successfully'
    });
  } catch (error) {
    console.error('PUT /api/investments/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(_request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid ID' 
      }, { status: 400 });
    }
    
    // Delete investment from unified transactions table
    const res = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND type = $3', 
      [id, user.id, 'investment']
    );
    
    const success = res.rowCount !== null && res.rowCount > 0;
    
    return NextResponse.json({ 
      success,
      message: success ? 'Investment deleted successfully' : 'Investment not found or access denied'
    });
  } catch (error) {
    console.error('DELETE /api/investments/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


