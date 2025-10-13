import { NextRequest, NextResponse } from 'next/server';
import { UserWalletDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// GET - Get all wallets for user with calculated balances
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

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type'
        },
        { status: 400 }
      );
    }

    // Validate balance
    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Balance must be a non-negative number'
        },
        { status: 400 }
      );
    }

    // Create wallet (balance will be calculated from transactions)
    const wallet = await UserWalletDatabase.createWallet(
      user.id,
      name,
      type,
      color,
      icon
    );

    // If user provided a starting balance, create an initial income transaction
    if (balance > 0) {
      const { TransactionDatabase } = await import('@/lib/database');
      
      await TransactionDatabase.createTransaction(
        user.id,
        `Initial balance for ${name}`,
        balance,
        'income',
        wallet.id,
        'Initial Balance',
        'Wallet Creation',
        undefined,
        undefined,
        new Date()
      );
      
      console.log(`Created initial balance transaction: ${balance} for wallet ${name} (ID: ${wallet.id})`);
    }

    // Return wallet with calculated balance
    const walletsWithBalances = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
    const createdWallet = walletsWithBalances.find(w => w.id === wallet.id);

    return NextResponse.json({
      success: true,
      data: createdWallet || wallet,
      message: balance > 0 ? `Wallet created successfully with initial balance of Rp${balance.toLocaleString()}` : 'Wallet created successfully'
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
