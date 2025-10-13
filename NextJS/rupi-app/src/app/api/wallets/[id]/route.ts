import { NextRequest, NextResponse } from 'next/server';
import { UserWalletDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// PUT - Update wallet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, type, balance, color, icon } = body;

    // Validate balance if provided
    if (balance !== undefined && (typeof balance !== 'number' || balance < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Balance must be a non-negative number'
        },
        { status: 400 }
      );
    }

    // Prepare updates object (exclude balance as it's calculated from transactions)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    // Handle balance adjustment if provided
    if (balance !== undefined) {
      const currentBalance = await UserWalletDatabase.calculateWalletBalance(user.id, walletId);
      const balanceDifference = balance - currentBalance;
      
      if (Math.abs(balanceDifference) > 0.01) { // Only create adjustment if there's a meaningful difference
        const { WalletBalanceAdjustmentDatabase } = await import('@/lib/database');
        
        await WalletBalanceAdjustmentDatabase.createAdjustment(
          user.id,
          walletId,
          balanceDifference,
          `Manual balance adjustment for ${name || 'wallet'}`,
          'manual_adjustment'
        );
        
        console.log(`Added balance adjustment: ${balanceDifference > 0 ? '+' : ''}${balanceDifference} to wallet ${walletId}`);
      }
    }

    if (Object.keys(updates).length === 0 && balance === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'No updates provided'
        },
        { status: 400 }
      );
    }

    // Update wallet (only non-balance fields)
    const wallet = await UserWalletDatabase.updateWallet(user.id, walletId, updates);

    // Return wallet with calculated balance
    const walletsWithBalances = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
    const updatedWallet = walletsWithBalances.find(w => w.id === walletId);

    return NextResponse.json({
      success: true,
      data: updatedWallet || wallet,
      message: 'Wallet updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/wallets/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete wallet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet ID'
        },
        { status: 400 }
      );
    }

    // Delete wallet
    const success = await UserWalletDatabase.deleteWallet(user.id, walletId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found or access denied'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/wallets/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
