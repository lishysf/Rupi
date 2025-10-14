import { NextRequest, NextResponse } from 'next/server';
import { TransactionDatabase, initializeDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// DELETE - Remove a savings transaction by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid savings ID' },
        { status: 400 }
      );
    }

    // Delete the savings transaction using the unified system
    const deleted = await TransactionDatabase.deleteTransaction(user.id, id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Savings transaction not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Savings transaction deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/savings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete savings transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update a savings transaction by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid savings ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, amount, goalName } = body as { description?: string; amount?: number; goalName?: string };

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Update the savings transaction using the unified system
    const updatedTransaction = await TransactionDatabase.updateTransaction(
      user.id,
      id,
      description,
      amount,
      'savings',
      undefined, // walletId - keep existing
      undefined, // category
      undefined, // source
      goalName,
      undefined, // assetName
      undefined, // transferType
      undefined  // date - keep existing
    );

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: 'Savings transaction updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/savings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update savings transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


