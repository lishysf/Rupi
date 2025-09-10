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
    } else {
      // Legacy support for days-based ranges
      const days = parseInt(timeRange.replace('d', '')) || 30;
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }
    
         // Query to get daily income and expense totals
     const query = `
       WITH date_series AS (
         SELECT generate_series(
           $1::date,
           $2::date,
           '1 day'::interval
         )::date as date
       ),
       daily_expenses AS (
         SELECT 
           DATE(e.date) as expense_date,
           SUM(e.amount) as total_expenses
         FROM expenses e
         WHERE e.user_id = $3 AND e.date >= $1 AND e.date <= $2
         GROUP BY DATE(e.date)
       ),
       daily_income AS (
         SELECT 
           DATE(i.date) as income_date,
           SUM(i.amount) as total_income
         FROM income i
         WHERE i.user_id = $3 AND i.date >= $1 AND i.date <= $2
         GROUP BY DATE(i.date)
       )
       SELECT 
         ds.date,
         COALESCE(de.total_expenses, 0) as expenses,
         COALESCE(di.total_income, 0) as income,
         COALESCE(di.total_income, 0) - COALESCE(de.total_expenses, 0) as net
       FROM date_series ds
       LEFT JOIN daily_expenses de ON ds.date = de.expense_date
       LEFT JOIN daily_income di ON ds.date = di.income_date
       ORDER BY ds.date ASC
     `;
     
     const result = await pool.query(query, [startDate, endDate, user.id]);
     
     // Transform the data to match the expected format
     const trendsData = result.rows.map(row => {
       // Handle date formatting consistently - use local date to avoid timezone issues
       const date = new Date(row.date);
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       
       return {
         date: `${year}-${month}-${day}`, // Format as YYYY-MM-DD in local timezone
         income: parseFloat(row.income) || 0,
         expenses: parseFloat(row.expenses) || 0,
         net: parseFloat(row.net) || 0
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
