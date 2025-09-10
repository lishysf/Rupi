import { NextRequest, NextResponse } from 'next/server';
import { IncomeDatabase, initializeDatabase, INCOME_SOURCES } from '@/lib/database';
import { requireAuth } from '@/lib/auth-utils';

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
}

// GET - Fetch income
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);
    
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const summary = searchParams.get('summary') === 'true';

    let income;

    if (summary) {
      // Return income summary by source
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      income = await IncomeDatabase.getIncomeSummaryBySource(user.id, start, end);
    } else if (source && INCOME_SOURCES.includes(source as any)) {
      // Filter by source
      income = await IncomeDatabase.getIncomeBySource(user.id, source as any);
    } else if (startDate && endDate) {
      // Filter by date range
      income = await IncomeDatabase.getIncomeByDateRange(
        user.id,
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      // Get all income with pagination
      income = await IncomeDatabase.getAllIncome(user.id, limit, offset);
    }

    return NextResponse.json({
      success: true,
      data: income,
      message: 'Income retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/income error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new income
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const user = await requireAuth(request);

    const body = await request.json();
    const { description, amount, source, date } = body;

    // Validate required fields
    if (!description || !amount || !source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: description, amount, source'
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

    // Validate source
    if (!INCOME_SOURCES.includes(source)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid source. Must be one of: ${INCOME_SOURCES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Create income
    const income = await IncomeDatabase.createIncome(
      user.id,
      description,
      amount,
      source,
      date ? new Date(date) : undefined
    );

    return NextResponse.json({
      success: true,
      data: income,
      message: 'Income created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/income error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create income',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
