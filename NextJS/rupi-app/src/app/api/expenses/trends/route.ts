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
       WITH        date_series AS (
         SELECT generate_series(
           $1::date,
           $2::date,
           '1 day'::interval
         )::date as date
       ),
       daily_expenses AS (
         SELECT 
           expense_date,
           SUM(total_expenses) as total_expenses
         FROM (
           SELECT 
             DATE(e.date) as expense_date,
             SUM(e.amount) as total_expenses
           FROM expenses e
           WHERE e.user_id = $3 AND e.date >= $1 AND e.date <= $2
           GROUP BY DATE(e.date)
           UNION ALL
           SELECT 
             DATE(t.date) as expense_date,
             SUM(-t.amount) as total_expenses
           FROM transactions t
           WHERE t.user_id = $3 AND t.type = 'expense' AND t.date >= $1 AND t.date <= $2
           GROUP BY DATE(t.date)
         ) combined_expenses
         GROUP BY expense_date
       ),
       daily_income AS (
         SELECT 
           income_date,
           SUM(total_income) as total_income
         FROM (
           SELECT 
             DATE(i.date) as income_date,
             SUM(i.amount) as total_income
           FROM income i
           WHERE i.user_id = $3 AND i.date >= $1 AND i.date <= $2
           GROUP BY DATE(i.date)
           UNION ALL
           SELECT 
             DATE(t.date) as income_date,
             SUM(t.amount) as total_income
           FROM transactions t
           WHERE t.user_id = $3 AND t.type = 'income' AND t.date >= $1 AND t.date <= $2
           GROUP BY DATE(t.date)
         ) combined_income
         GROUP BY income_date
       ),
       daily_savings AS (
         SELECT 
           savings_date,
           SUM(total_savings) as total_savings
         FROM (
           SELECT 
             DATE(s.date) as savings_date,
             SUM(s.amount) as total_savings
           FROM savings s
           WHERE s.user_id = $3 AND s.date >= $1 AND s.date <= $2
           GROUP BY DATE(s.date)
           UNION ALL
           SELECT 
             DATE(t.date) as savings_date,
             SUM(t.amount) as total_savings
           FROM transactions t
           WHERE t.user_id = $3 AND t.type = 'transfer' AND t.category = 'Savings Transfer' AND t.date >= $1 AND t.date <= $2
           GROUP BY DATE(t.date)
         ) combined_savings
         GROUP BY savings_date
       ),
       daily_investments AS (
         SELECT 
           DATE(inv.date) as investment_date,
           SUM(inv.amount) as total_investments
         FROM investments inv
         WHERE inv.user_id = $3 AND inv.date >= $1 AND inv.date <= $2
         GROUP BY DATE(inv.date)
       ),
       cumulative_wallet_balance AS (
         SELECT 
           ds.date,
           COALESCE(SUM(
             CASE 
               WHEN t.type = 'income' OR t.type = 'transfer' THEN t.amount
               WHEN t.type = 'expense' THEN -t.amount
               ELSE 0
             END
           ), 0) as cumulative_wallet_balance
         FROM date_series ds
         LEFT JOIN transactions t ON DATE(t.date) <= ds.date AND DATE(t.date) <= CURRENT_DATE
         LEFT JOIN user_wallets w ON t.wallet_id = w.id
         WHERE (t.user_id = $3 OR t.user_id IS NULL) AND (w.user_id = $3 OR w.user_id IS NULL) AND (w.is_active = true OR w.is_active IS NULL)
         GROUP BY ds.date
       ),
       cumulative_old_wallet_balance AS (
         SELECT 
           ds.date,
           COALESCE(SUM(i.amount), 0) - COALESCE(SUM(e.amount), 0) as cumulative_old_balance
         FROM date_series ds
         LEFT JOIN income i ON DATE(i.date) <= ds.date AND DATE(i.date) <= CURRENT_DATE AND i.user_id = $3
         LEFT JOIN expenses e ON DATE(e.date) <= ds.date AND DATE(e.date) <= CURRENT_DATE AND e.user_id = $3
         LEFT JOIN user_wallets w ON (i.wallet_id = w.id OR e.wallet_id = w.id)
         WHERE w.user_id = $3 AND w.is_active = true
         GROUP BY ds.date
       ),
       cumulative_savings_balance AS (
         SELECT 
           ds.date,
           COALESCE(SUM(s.amount), 0) as cumulative_savings
         FROM date_series ds
         LEFT JOIN savings s ON DATE(s.date) <= ds.date AND DATE(s.date) <= CURRENT_DATE
         WHERE s.user_id = $3
         GROUP BY ds.date
       ),
       cumulative_investments_balance AS (
         SELECT 
           ds.date,
           COALESCE(SUM(inv.amount), 0) as cumulative_investments
         FROM date_series ds
         LEFT JOIN investments inv ON DATE(inv.date) <= ds.date AND DATE(inv.date) <= CURRENT_DATE
         WHERE inv.user_id = $3
         GROUP BY ds.date
       )
       SELECT 
         ds.date,
         COALESCE(SUM(de.total_expenses), 0) as expenses,
         COALESCE(SUM(di.total_income), 0) as income,
         COALESCE(ds_savings.total_savings, 0) as savings,
         COALESCE(ds_inv.total_investments, 0) as investments,
         COALESCE(SUM(di.total_income), 0) - COALESCE(SUM(de.total_expenses), 0) as net,
         COALESCE(cwb.cumulative_wallet_balance, 0) + COALESCE(cowb.cumulative_old_balance, 0) + COALESCE(csb.cumulative_savings, 0) + COALESCE(cib.cumulative_investments, 0) as total_assets
       FROM date_series ds
       LEFT JOIN daily_expenses de ON ds.date = de.expense_date
       LEFT JOIN daily_income di ON ds.date = di.income_date
       LEFT JOIN daily_savings ds_savings ON ds.date = ds_savings.savings_date
       LEFT JOIN daily_investments ds_inv ON ds.date = ds_inv.investment_date
       LEFT JOIN cumulative_wallet_balance cwb ON ds.date = cwb.date
       LEFT JOIN cumulative_old_wallet_balance cowb ON ds.date = cowb.date
       LEFT JOIN cumulative_savings_balance csb ON ds.date = csb.date
       LEFT JOIN cumulative_investments_balance cib ON ds.date = cib.date
       GROUP BY ds.date, ds_savings.total_savings, ds_inv.total_investments, cwb.cumulative_wallet_balance, cowb.cumulative_old_balance, csb.cumulative_savings, cib.cumulative_investments
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
