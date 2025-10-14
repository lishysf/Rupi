import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { initializeDatabase, pool, TransactionDatabase } from '@/lib/database';

let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// POST - Create wallet transfer
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
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
      const sourceBalance = await TransactionDatabase.calculateWalletBalance(user.id, fromWalletId);
      
      if (sourceBalance < amount) {
        throw new Error(`Insufficient balance in ${fromWallet.name}. Available: ${sourceBalance}, Required: ${amount}`);
      }

      // Create transaction records for the transfer (no separate wallet_transfers table needed)
      
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
        'wallet_to_wallet',
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
        'wallet_to_wallet',
        new Date()
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          fromWalletId,
          toWalletId,
          amount,
          description: description || `Transfer from ${fromWallet.name} to ${toWallet.name}`,
          transferType: 'wallet_to_wallet'
        },
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
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    // Get transfer transactions from the unified transactions table
    const transactions = await TransactionDatabase.getUserTransactions(user.id);
    
    // Filter for transfer transactions and group them
    const transferTransactions = transactions.filter(t => t.type === 'transfer');
    
    // Group outgoing and incoming transfers to create transfer pairs
    const transfers = [];
    const processedIds = new Set();
    
    for (const transaction of transferTransactions) {
      if (processedIds.has(transaction.id)) continue;
      
      // Find the corresponding transaction (outgoing/incoming pair)
      const correspondingTransaction = transferTransactions.find(t => 
        t.id !== transaction.id && 
        Math.abs(t.amount) === Math.abs(transaction.amount) &&
        Math.abs(new Date(t.created_at).getTime() - new Date(transaction.created_at).getTime()) < 1000 && // Within 1 second
        t.description.includes('Transfer') && 
        transaction.description.includes('Transfer')
      );
      
      if (correspondingTransaction) {
        const fromTransaction = transaction.amount < 0 ? transaction : correspondingTransaction;
        const toTransaction = transaction.amount > 0 ? transaction : correspondingTransaction;
        
        transfers.push({
          id: fromTransaction.id, // Use outgoing transaction ID as transfer ID
          fromWalletId: fromTransaction.wallet_id,
          toWalletId: toTransaction.wallet_id,
          toSavings: false,
          amount: Math.abs(fromTransaction.amount),
          description: fromTransaction.description,
          transferType: 'wallet_to_wallet',
          createdAt: fromTransaction.created_at,
          fromWallet: {
            id: fromTransaction.wallet_id,
            name: 'Wallet', // Will be populated by frontend if needed
            type: 'bank',
            color: '#3B82F6'
          },
          toWallet: {
            id: toTransaction.wallet_id,
            name: 'Wallet', // Will be populated by frontend if needed
            type: 'bank',
            color: '#3B82F6'
          }
        });
        
        processedIds.add(transaction.id);
        processedIds.add(correspondingTransaction.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
