import { NextRequest, NextResponse } from 'next/server';
import { BudgetDatabase, initializeDatabase, EXPENSE_CATEGORIES } from '@/lib/database';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// GET - Fetch budgets for current month
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString()); // Frontend already sends 1-based month
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    console.log('API: Fetching budgets for month:', month, 'year:', year);
    
    // Get budgets for the specified month/year
    const budgets = await BudgetDatabase.getAllBudgets(user.id, month, year);
    console.log('API: Found budgets:', budgets);
    
    // Get actual spending for each category in the same month with optimized query
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month
    
    // Optimized query with better indexing and only fetch categories that have budgets
    const budgetCategories = budgets.map(b => b.category);
    const spendingQuery = `
      SELECT 
        category,
        SUM(amount) as spent
      FROM expenses 
      WHERE user_id = $1 
        AND date >= $2 
        AND date <= $3
        AND category = ANY($4)
      GROUP BY category
    `;
    const spendingResult = await pool.query(spendingQuery, [user.id, startDate, endDate, budgetCategories]);
    
    // Create a map of spending by category
    const spendingMap = new Map();
    spendingResult.rows.forEach(row => {
      spendingMap.set(row.category, parseFloat(row.spent) || 0);
    });
    
    // Combine budget and spending data
    const budgetData = budgets.map(budget => ({
      id: budget.id,
      category: budget.category,
      budget: budget.budget,
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
    const user = await requireAuth(request);

    const body = await request.json();
    const { category, amount, month, year } = body;
    
    console.log('API: Budget POST request received:', { category, amount, month, year });

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

    // Validate category
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
        },
        { status: 400 }
      );
    }

    const budgetMonth = month || (new Date().getMonth() + 1);
    const budgetYear = year || new Date().getFullYear();

    // Create or update budget
    const budget = await BudgetDatabase.createOrUpdateBudget(
      user.id,
      category,
      amount,
      budgetMonth,
      budgetYear
    );
    
    console.log('API: Budget query result:', budget);

    return NextResponse.json({
      success: true,
      data: budget,
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
    const user = await requireAuth(request);

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

    const success = await BudgetDatabase.deleteBudget(user.id, category, month, year);
    
    console.log('API: Delete result:', success);

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
      deleted: success ? 1 : 0
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
