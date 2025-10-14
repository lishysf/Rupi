import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { UserWalletDatabase } from '@/lib/database';

// GET - Get specific wallet
export async function GET(
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

    const wallets = await UserWalletDatabase.getAllWalletsWithBalances(user.id);
    const wallet = wallets.find(w => w.id === walletId);

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet,
      message: 'Wallet retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/wallets/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve wallet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update wallet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const walletId = parseInt(id);
    const body = await request.json();

    if (isNaN(walletId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet ID'
        },
        { status: 400 }
      );
    }

    const { name, type, color, icon } = body;

    // Validate required fields
    if (!name && !type && !color && !icon) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one field must be provided for update'
        },
        { status: 400 }
      );
    }

    // Prepare updates object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    // Update the wallet
    const updatedWallet = await UserWalletDatabase.updateWallet(user.id, walletId, updates);

    return NextResponse.json({
      success: true,
      data: updatedWallet,
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

    // Delete the wallet (soft delete)
    const deleted = await UserWalletDatabase.deleteWallet(user.id, walletId);

    if (!deleted) {
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