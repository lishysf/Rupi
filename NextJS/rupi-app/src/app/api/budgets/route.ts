import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database';
import pool from '@/lib/database';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    
    // Create budgets table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, month, year)
      )
    `);
    
    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
    `);
    
    dbInitialized = true;
  }
}

// GET - Fetch budgets for current month
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString()); // Frontend already sends 1-based month
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    console.log('API: Fetching budgets for month:', month, 'year:', year);
    
    // Get budgets for the specified month/year
    const budgetsQuery = `
      SELECT * FROM budgets 
      WHERE month = $1 AND year = $2
      ORDER BY category ASC
    `;
    const budgetsResult = await pool.query(budgetsQuery, [month, year]);
    console.log('API: Found budgets:', budgetsResult.rows);
    
    // Get actual spending for each category in the same month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month
    
    const spendingQuery = `
      SELECT 
        category,
        SUM(amount) as spent
      FROM expenses 
      WHERE date >= $1 AND date <= $2
      GROUP BY category
    `;
    const spendingResult = await pool.query(spendingQuery, [startDate, endDate]);
    
    // Create a map of spending by category
    const spendingMap = new Map();
    spendingResult.rows.forEach(row => {
      spendingMap.set(row.category, parseFloat(row.spent) || 0);
    });
    
    // Combine budget and spending data
    const budgetData = budgetsResult.rows.map(budget => ({
      id: budget.id,
      category: budget.category,
      budget: parseFloat(budget.amount),
      spent: spendingMap.get(budget.category) || 0,
      month: budget.month,
      year: budget.year
    }));

    console.log('API: Returning budget data:', budgetData);

    return NextResponse.json({
      success: true,
      data: budgetData,
      message: 'Budgets retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve budgets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create or update budget
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { category, amount, month, year } = body;

    // Validate required fields
    if (!category || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: category, amount'
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be a positive number'
        },
        { status: 400 }
      );
    }

    const budgetMonth = month || (new Date().getMonth() + 1);
    const budgetYear = year || new Date().getFullYear();

    // Insert or update budget using ON CONFLICT
    const query = `
      INSERT INTO budgets (category, amount, month, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (category, month, year)
      DO UPDATE SET 
        amount = EXCLUDED.amount,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [category, amount, budgetMonth, budgetYear]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Budget saved successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove budget
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString()); // Frontend already sends 1-based month
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    console.log('API: Deleting budget for category:', category, 'month:', month, 'year:', year);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category is required'
        },
        { status: 400 }
      );
    }

    const query = `DELETE FROM budgets WHERE category = $1 AND month = $2 AND year = $3`;
    console.log('API: Executing delete query with params:', [category, month, year]);
    const result = await pool.query(query, [category, month, year]);
    
    console.log('API: Delete result rowCount:', result.rowCount);

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
      deleted: result.rowCount || 0
    });

  } catch (error) {
    console.error('DELETE /api/budgets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
