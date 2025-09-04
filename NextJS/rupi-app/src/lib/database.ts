import { Pool } from 'pg';

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Database initialization
export async function initializeDatabase() {
  try {
    // Create expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create income table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS income (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        source VARCHAR(100) NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for expenses
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);

    // Create indexes for income
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Food & Groceries', 
  'Transportation',
  'Health & Personal',
  'Entertainment & Shopping',
  'Debt & Savings',
  'Family & Others'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Income sources
export const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Bonus',
  'Gift',
  'Others'
] as const;

export type IncomeSource = typeof INCOME_SOURCES[number];

// Expense interface
export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Income interface
export interface Income {
  id: number;
  description: string;
  amount: number;
  source: IncomeSource;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Database operations
export class ExpenseDatabase {
  // Create a new expense
  static async createExpense(
    description: string,
    amount: number,
    category: ExpenseCategory,
    date?: Date
  ): Promise<Expense> {
    const query = `
      INSERT INTO expenses (description, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [description, amount, category, date || new Date()];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Get all expenses
  static async getAllExpenses(limit = 100, offset = 0): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      ORDER BY date DESC, created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expenses by date range
  static async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }
  }

  // Get expenses by category
  static async getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      WHERE category = $1
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [category]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      throw error;
    }
  }

  // Get expense summary by category
  static async getExpenseSummaryByCategory(startDate?: Date, endDate?: Date): Promise<Array<{category: string, total: number, count: number}>> {
    let query = `
      SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
    `;
    const values: any[] = [];
    
    if (startDate && endDate) {
      query += ` WHERE date >= $1 AND date <= $2`;
      values.push(startDate, endDate);
    }
    
    query += ` GROUP BY category ORDER BY total DESC`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }

  // Update an expense
  static async updateExpense(
    id: number,
    description?: string,
    amount?: number,
    category?: ExpenseCategory,
    date?: Date
  ): Promise<Expense> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE expenses 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Expense not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete an expense
  static async deleteExpense(id: number): Promise<boolean> {
    const query = `DELETE FROM expenses WHERE id = $1`;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
}

// Income database operations
export class IncomeDatabase {
  // Create a new income
  static async createIncome(
    description: string,
    amount: number,
    source: IncomeSource,
    date?: Date
  ): Promise<Income> {
    const query = `
      INSERT INTO income (description, amount, source, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [description, amount, source, date || new Date()];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating income:', error);
      throw error;
    }
  }

  // Get all income
  static async getAllIncome(limit = 100, offset = 0): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      ORDER BY date DESC, created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income:', error);
      throw error;
    }
  }

  // Get income by date range
  static async getIncomeByDateRange(startDate: Date, endDate: Date): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income by date range:', error);
      throw error;
    }
  }

  // Get income by source
  static async getIncomeBySource(source: IncomeSource): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      WHERE source = $1
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [source]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income by source:', error);
      throw error;
    }
  }

  // Get income summary by source
  static async getIncomeSummaryBySource(startDate?: Date, endDate?: Date): Promise<Array<{source: string, total: number, count: number}>> {
    let query = `
      SELECT 
        source,
        SUM(amount) as total,
        COUNT(*) as count
      FROM income
    `;
    const values: any[] = [];
    
    if (startDate && endDate) {
      query += ` WHERE date >= $1 AND date <= $2`;
      values.push(startDate, endDate);
    }
    
    query += ` GROUP BY source ORDER BY total DESC`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income summary:', error);
      throw error;
    }
  }

  // Update an income
  static async updateIncome(
    id: number,
    description?: string,
    amount?: number,
    source?: IncomeSource,
    date?: Date
  ): Promise<Income> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(source);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE income 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Income not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating income:', error);
      throw error;
    }
  }

  // Delete an income
  static async deleteIncome(id: number): Promise<boolean> {
    const query = `DELETE FROM income WHERE id = $1`;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  }
}

export default pool;
