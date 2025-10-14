import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { UserWalletDatabase } from '@/lib/database';

// GET - Get all wallets for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const wallets = await UserWalletDatabase.getAllWalletsWithBalances(user.id);

    return NextResponse.json({
      success: true,
      data: wallets,
      message: 'Wallets retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/wallets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve wallets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new wallet
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const { name, type, balance = 0, color = '#10B981', icon = 'wallet' } = body;

    if (!name || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type'
        },
        { status: 400 }
      );
    }

    // Create the wallet
    const wallet = await UserWalletDatabase.createWallet(user.id, name, type, color, icon);

    // If initial balance is provided and greater than 0, create an initial income transaction
    if (balance > 0) {
      const { TransactionDatabase } = await import('@/lib/database');
      
      await TransactionDatabase.createTransaction(
        user.id,
        `Initial balance for ${name}`,
        balance,
        'income',
        wallet.id,
        undefined,
        'Initial Balance'
      );
    }

    // Get the wallet with calculated balance
    const wallets = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
    const walletWithBalance = wallets.find(w => w.id === wallet.id);

    return NextResponse.json({
      success: true,
      data: walletWithBalance || wallet,
      message: 'Wallet created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/wallets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}