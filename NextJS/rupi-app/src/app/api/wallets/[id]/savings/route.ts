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

// GET - Get savings data for a specific wallet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    const { id } = await params;
    const walletId = parseInt(id);

    if (isNaN(walletId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet ID' },
        { status: 400 }
      );
    }

    // Get all transactions for the user and filter for savings from this wallet
    const allTransactions = await TransactionDatabase.getUserTransactions(user.id, 1000, 0);
    const walletSavings = allTransactions.filter(t => 
      t.type === 'savings' && t.wallet_id === walletId
    );

    // Calculate total savings
    const totalSavings = walletSavings.reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);
    const savingsCount = walletSavings.length;

    // Group savings by goal
    const savingsByGoalMap = new Map<string, { totalAmount: number; transactionCount: number }>();
    walletSavings.forEach(transaction => {
      const goalName = transaction.goal_name || 'General Savings';
      const amount = parseFloat(transaction.amount.toString()) || 0;
      
      if (savingsByGoalMap.has(goalName)) {
        const existing = savingsByGoalMap.get(goalName)!;
        existing.totalAmount += amount;
        existing.transactionCount += 1;
      } else {
        savingsByGoalMap.set(goalName, { totalAmount: amount, transactionCount: 1 });
      }
    });

    const savingsByGoal = Array.from(savingsByGoalMap.entries())
      .map(([goalName, data]) => ({
        goalName,
        totalAmount: data.totalAmount,
        transactionCount: data.transactionCount
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get recent savings transactions (last 10)
    const recentSavings = walletSavings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(transaction => ({
        id: transaction.id,
        description: transaction.description,
        amount: parseFloat(transaction.amount.toString()) || 0,
        goalName: transaction.goal_name,
        date: transaction.date,
        createdAt: transaction.created_at
      }));

    return NextResponse.json({
      success: true,
      data: {
        walletId,
        totalSavings,
        savingsCount,
        savingsByGoal,
        recentSavings
      }
    });

  } catch (error) {
    console.error('GET /api/wallets/[id]/savings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet savings data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
