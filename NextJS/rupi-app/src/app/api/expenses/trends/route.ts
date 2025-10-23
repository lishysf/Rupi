import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth-utils';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('range') || 'current_month';
    
    // Calculate date range based on time range
    let startDate: Date;
    let endDate: Date;
    
    if (timeRange === 'current_month') {
      // Current month - full month from 1st to last day
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else if (timeRange === 'last_month') {
      // Previous month - full month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    } else if (timeRange === '7d') {
      // Last 7 days including today + 1 day buffer to ensure we capture all data
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // Add 1 day buffer
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6); // 7 days total including today
    } else {
      // Legacy support for days-based ranges
      const days = parseInt(timeRange.replace('d', '')) || 30;
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }
    
    // Debug: Log the date range being used
    console.log(`Date range for ${timeRange}:`, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      daysDifference: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    });
    
         // Query to get daily income, expense, and total assets
     const query = `
      WITH date_series AS (
        SELECT generate_series(
          $1::date,
          $2::date,
          '1 day'::interval
        )::date as date
      ),
      daily_transactions AS (
        SELECT 
          DATE(t.date) as transaction_date,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses,
          SUM(CASE WHEN t.type = 'savings' THEN t.amount ELSE 0 END) as savings,
        FROM transactions t
        WHERE t.user_id = $3 AND t.date >= $1 AND t.date <= $2
        GROUP BY DATE(t.date)
      )
      SELECT 
        ds.date,
        COALESCE(dt.income, 0) as income,
        COALESCE(dt.expenses, 0) as expenses,
        COALESCE(dt.savings, 0) as savings,
        COALESCE(dt.income, 0) - COALESCE(dt.expenses, 0) as net,
        COALESCE(dt.income, 0) - COALESCE(dt.expenses, 0) + COALESCE(dt.savings, 0) as total_assets
      FROM date_series ds
      LEFT JOIN daily_transactions dt ON ds.date = dt.transaction_date
      ORDER BY ds.date ASC
    `;
     
     const result = await pool.query(query, [startDate, endDate, user.id]);
     
     // Get top 3 expense categories for each day for tooltip
     const topExpensesQuery = `
       WITH daily_category_totals AS (
         SELECT 
           DATE(e.date) as expense_date,
           e.category,
           SUM(e.amount) as total_amount,
           COUNT(*) as transaction_count
         FROM expenses e
         WHERE e.user_id = $3 AND e.date >= $1 AND e.date <= $2
         GROUP BY DATE(e.date), e.category
       ),
       daily_top_categories AS (
         SELECT 
           expense_date,
           category,
           total_amount,
           transaction_count,
           ROW_NUMBER() OVER (PARTITION BY expense_date ORDER BY total_amount DESC) as rn
         FROM daily_category_totals
       )
       SELECT 
         expense_date,
         category,
         total_amount,
         transaction_count
       FROM daily_top_categories
       WHERE rn <= 3
       ORDER BY expense_date, rn
     `;
     
     const topExpensesResult = await pool.query(topExpensesQuery, [startDate, endDate, user.id]);
     
     // Group top expense categories by date
     const topExpensesByDate: Record<string, Array<{category: string, amount: number, count: number}>> = {};
     topExpensesResult.rows.forEach(row => {
       // Use consistent date formatting to match the main data transformation
       const date = new Date(row.expense_date);
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       const dateStr = `${year}-${month}-${day}`;
       
       if (!topExpensesByDate[dateStr]) {
         topExpensesByDate[dateStr] = [];
       }
       topExpensesByDate[dateStr].push({
         category: row.category,
         amount: parseFloat(row.total_amount),
         count: parseInt(row.transaction_count)
       });
     });
     
     // Debug: Log the raw database result
     console.log(`Database result for ${timeRange}:`, {
       rowCount: result.rows.length,
       sampleRows: result.rows.slice(0, 3), // Show first 3 rows
       allDates: result.rows.map(row => row.date)
     });
     
     // Debug: Log top expense categories by date
     console.log('Top expense categories by date:', Object.keys(topExpensesByDate).slice(0, 5), '...');
     
     // Transform the data to match the expected format
     const trendsData = result.rows.map(row => {
       // Handle date formatting consistently - use local date to avoid timezone issues
       const date = new Date(row.date);
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       
       const dateStr = `${year}-${month}-${day}`;
       
       // Debug: Log date matching for first few entries
       if (result.rows.indexOf(row) < 3) {
         console.log(`Date matching debug:`, {
           originalDate: row.date,
           formattedDate: dateStr,
           hasTopCategories: !!topExpensesByDate[dateStr],
           topCategoriesCount: topExpensesByDate[dateStr]?.length || 0
         });
       }
       
       return {
         date: dateStr, // Format as YYYY-MM-DD in local timezone
         income: parseFloat(row.income) || 0,
         expenses: parseFloat(row.expenses) || 0,
         savings: parseFloat(row.savings) || 0,
         investments: parseFloat(row.investments) || 0,
         net: parseFloat(row.net) || 0,
         total_assets: parseFloat(row.total_assets) || 0,
         top_expenses: topExpensesByDate[dateStr] || []
       };
     });

    return NextResponse.json({
      success: true,
      data: trendsData,
      message: 'Expense trends retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/expenses/trends error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve expense trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
