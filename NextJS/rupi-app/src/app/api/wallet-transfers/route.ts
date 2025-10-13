import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth-utils';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// POST - Create wallet transfer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { fromWalletId, toWalletId, amount, description } = body;

    // Validate required fields
    if (!fromWalletId || !toWalletId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fromWalletId, toWalletId, amount' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate wallets are different
    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { success: false, error: 'Cannot transfer to the same wallet' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify both wallets belong to user
      const walletCheck = await client.query(
        'SELECT id, name FROM user_wallets WHERE id IN ($1, $2) AND user_id = $3',
        [fromWalletId, toWalletId, user.id]
      );

      if (walletCheck.rows.length !== 2) {
        throw new Error('One or both wallets not found or do not belong to user');
      }

      const fromWallet = walletCheck.rows.find(w => w.id === fromWalletId);
      const toWallet = walletCheck.rows.find(w => w.id === toWalletId);

      if (!fromWallet || !toWallet) {
        throw new Error('Wallet not found');
      }

      // Check if source wallet has sufficient balance (calculate from transactions)
      const { TransactionDatabase } = await import('@/lib/database');
      const sourceBalance = await TransactionDatabase.calculateWalletBalance(user.id, fromWalletId);
      
      if (sourceBalance < amount) {
        throw new Error(`Insufficient balance in ${fromWallet.name}. Available: ${sourceBalance}, Required: ${amount}`);
      }

      // Create wallet transfer record
      const transferQuery = `
        INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, to_savings, amount, description, transfer_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const transferResult = await client.query(transferQuery, [
        user.id,
        fromWalletId,
        toWalletId,
        false, // to_savings = false for wallet-to-wallet transfer
        amount,
        description || `Transfer from ${fromWallet.name} to ${toWallet.name}`,
        'wallet_to_wallet'
      ]);

      // Create transaction records for the transfer
      
      // Create outgoing transaction for source wallet
      await TransactionDatabase.createTransaction(
        user.id,
        `Transfer to ${toWallet.name}${description ? `: ${description}` : ''}`,
        -amount, // Negative amount for outgoing
        'transfer',
        fromWalletId,
        'Transfer', // Transfer category
        undefined,
        undefined,
        undefined,
        new Date()
      );

      // Create incoming transaction for destination wallet
      await TransactionDatabase.createTransaction(
        user.id,
        `Transfer from ${fromWallet.name}${description ? `: ${description}` : ''}`,
        amount, // Positive amount for incoming
        'transfer',
        toWalletId,
        'Transfer', // Transfer category
        undefined,
        undefined,
        undefined,
        new Date()
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: transferResult.rows[0],
        message: 'Transfer completed successfully'
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('POST /api/wallet-transfers error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process transfer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Get wallet transfers for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    const query = `
      SELECT 
        wt.*,
        fw.name as from_wallet_name,
        fw.type as from_wallet_type,
        fw.color as from_wallet_color,
        tw.name as to_wallet_name,
        tw.type as to_wallet_type,
        tw.color as to_wallet_color
      FROM wallet_transfers wt
      LEFT JOIN user_wallets fw ON wt.from_wallet_id = fw.id
      LEFT JOIN user_wallets tw ON wt.to_wallet_id = tw.id
      WHERE wt.user_id = $1
      ORDER BY wt.created_at DESC
    `;

    const result = await pool.query(query, [user.id]);

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        fromWalletId: row.from_wallet_id,
        toWalletId: row.to_wallet_id,
        toSavings: row.to_savings,
        amount: parseFloat(row.amount),
        description: row.description,
        transferType: row.transfer_type,
        createdAt: row.created_at,
        fromWallet: row.from_wallet_name ? {
          id: row.from_wallet_id,
          name: row.from_wallet_name,
          type: row.from_wallet_type,
          color: row.from_wallet_color
        } : null,
        toWallet: row.to_wallet_name ? {
          id: row.to_wallet_id,
          name: row.to_wallet_name,
          type: row.to_wallet_type,
          color: row.to_wallet_color
        } : null
      }))
    });

  } catch (error) {
    console.error('GET /api/wallet-transfers error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transfers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
