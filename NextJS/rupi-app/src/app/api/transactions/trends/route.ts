import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { TransactionDatabase } from '@/lib/database';
import { 
  getIndonesiaDate, 
  getIndonesiaCurrentMonthRange, 
  getIndonesiaLastDaysRange,
  formatIndonesiaDate 
} from '@/lib/indonesia-timezone';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    const type = searchParams.get('type'); // Filter by transaction type

    // Get all user transactions
    const transactions = await TransactionDatabase.getUserTransactions(user.id);
    
    // Filter by type if specified
    const filteredTransactions = type 
      ? transactions.filter(t => t.type === type)
      : transactions;

    // Calculate date range using Indonesia timezone
    const now = getIndonesiaDate();
    let startDate: Date;
    let endDate: Date;

    if (range === 'week') {
      const weekRange = getIndonesiaLastDaysRange(7);
      startDate = weekRange.startDate;
      endDate = weekRange.endDate;
    } else if (range === 'month') {
      const monthRange = getIndonesiaCurrentMonthRange();
      startDate = monthRange.startDate;
      endDate = monthRange.endDate;
    } else if (range === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      startDate = yearStart;
      endDate = now;
    } else {
      const daysRange = getIndonesiaLastDaysRange(30); // Default to 30 days
      startDate = daysRange.startDate;
      endDate = daysRange.endDate;
    }

    // Filter transactions by date range
    const rangeTransactions = filteredTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Group by date and calculate daily totals
    const dailyData: { [key: string]: { date: string, income: number, expenses: number, savings: number, transfers: number, total: number } } = {};
    
    rangeTransactions.forEach(transaction => {
      const date = formatIndonesiaDate(new Date(transaction.date));
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          income: 0,
          expenses: 0,
          savings: 0,
          transfers: 0,
          total: 0
        };
      }

      // Add to appropriate category
      if (transaction.type === 'income') {
        dailyData[date].income += transaction.amount;
      } else if (transaction.type === 'expense') {
        dailyData[date].expenses += transaction.amount;
      } else if (transaction.type === 'savings') {
        dailyData[date].savings += transaction.amount;
      } else if (transaction.type === 'transfer') {
        dailyData[date].transfers += transaction.amount;
      }

      dailyData[date].total += transaction.amount;
    });

    // Convert to array and sort by date
    const trendsData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary statistics
    const totalIncome = rangeTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = rangeTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSavings = rangeTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);
    

    const summary = {
      totalIncome,
      totalExpenses,
      totalSavings,
      netIncome: totalIncome - totalExpenses,
      transactionCount: rangeTransactions.length
    };

    return NextResponse.json({
      success: true,
      data: {
        trends: trendsData,
        summary,
        range: {
          start: formatIndonesiaDate(startDate),
          end: formatIndonesiaDate(endDate)
        }
      },
      message: 'Trends data retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/transactions/trends error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve trends data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
