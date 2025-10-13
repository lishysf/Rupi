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
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_wallets table first (needed by other tables)
    const walletsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_wallets'
      );
    `);
    
    if (!walletsTableExists.rows[0].exists) {
      // Create user_wallets table
      await pool.query(`
        CREATE TABLE user_wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          color VARCHAR(7) DEFAULT '#10B981',
          icon VARCHAR(50) DEFAULT 'wallet',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_wallets_type ON user_wallets(type);
    `);

    // Remove balance column from existing user_wallets table if it exists
    try {
      await pool.query(`
        ALTER TABLE user_wallets DROP COLUMN IF EXISTS balance;
      `);
    } catch (error) {
      // Column might not exist, that's okay
      console.log('Balance column removal:', error.message);
    }

    // Check if expenses table exists and add user_id column if it doesn't exist
    const expensesTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    if (expensesTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'expenses' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE expenses 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Create a default user for existing data
        const defaultUser = await pool.query(`
          INSERT INTO users (email, password_hash, name) 
          VALUES ('default@example.com', '$2a$12$default.hash.for.existing.data', 'Default User')
          ON CONFLICT (email) DO NOTHING
          RETURNING id;
        `);
        
        // Update existing expenses to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE expenses 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE expenses 
          ALTER COLUMN user_id SET NOT NULL;
        `);
      }
    } else {
      // Create expenses table with user_id
      await pool.query(`
        CREATE TABLE expenses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Check if income table exists and add user_id column if it doesn't exist
    const incomeTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'income'
      );
    `);
    
    if (incomeTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'income' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE income 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Get the default user ID
        const defaultUser = await pool.query(`
          SELECT id FROM users WHERE email = 'default@example.com';
        `);
        
        // Update existing income to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE income 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE income 
          ALTER COLUMN user_id SET NOT NULL;
        `);
      }
    } else {
      // Create income table with user_id
      await pool.query(`
        CREATE TABLE income (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          source VARCHAR(100) NOT NULL,
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Create indexes for expenses
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category);
    `);

    // Create indexes for income
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
    `);

    // Check if investments table exists and add user_id column if it doesn't exist
    const investmentsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investments'
      );
    `);
    
    if (investmentsTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'investments' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE investments 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Get the default user ID
        const defaultUser = await pool.query(`
          SELECT id FROM users WHERE email = 'default@example.com';
        `);
        
        // Update existing investments to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE investments 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE investments 
          ALTER COLUMN user_id SET NOT NULL;
        `);
      }
    } else {
      // Create investments table with user_id
      await pool.query(`
        CREATE TABLE investments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          asset_name VARCHAR(150),
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);
    `);



    // Check if savings table exists and add user_id column if it doesn't exist
    const savingsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'savings'
      );
    `);
    
    if (savingsTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'savings' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE savings 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Get the default user ID
        const defaultUser = await pool.query(`
          SELECT id FROM users WHERE email = 'default@example.com';
        `);
        
        // Update existing savings to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE savings 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE savings 
          ALTER COLUMN user_id SET NOT NULL;
        `);
      }
    } else {
      // Create savings table with user_id
      await pool.query(`
        CREATE TABLE savings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          goal_name VARCHAR(150),
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Create indexes for savings table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(date);
    `);

    // Check if savings_goals table exists and add user_id column if it doesn't exist
    const savingsGoalsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'savings_goals'
      );
    `);
    
    if (savingsGoalsTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'savings_goals' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE savings_goals 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Get the default user ID
        const defaultUser = await pool.query(`
          SELECT id FROM users WHERE email = 'default@example.com';
        `);
        
        // Update existing savings_goals to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE savings_goals 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE savings_goals 
          ALTER COLUMN user_id SET NOT NULL;
        `);
      }
    } else {
      // Create savings_goals table with user_id
      await pool.query(`
        CREATE TABLE savings_goals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          goal_name VARCHAR(150) NOT NULL,
          target_amount DECIMAL(10, 2) NOT NULL,
          current_amount DECIMAL(10, 2) DEFAULT 0,
          target_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Create indexes for savings_goals table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
    `);

    // Check if wallet_balance_adjustments table exists
    const walletAdjustmentsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wallet_balance_adjustments'
      );
    `);
    
    if (!walletAdjustmentsTableExists.rows[0].exists) {
      // Create wallet_balance_adjustments table
      await pool.query(`
        CREATE TABLE wallet_balance_adjustments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          wallet_id INTEGER NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          description TEXT NOT NULL,
          adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('initial_balance', 'manual_adjustment')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_balance_adjustments_user_id ON wallet_balance_adjustments(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_balance_adjustments_wallet_id ON wallet_balance_adjustments(wallet_id);
    `);

    // Check if wallet_transfers table exists
    const walletTransfersTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wallet_transfers'
      );
    `);
    
    if (!walletTransfersTableExists.rows[0].exists) {
      // Create wallet_transfers table for tracking money movements between wallets and savings
      await pool.query(`
        CREATE TABLE wallet_transfers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          from_wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          to_wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          to_savings BOOLEAN DEFAULT FALSE,
          amount DECIMAL(10, 2) NOT NULL,
          description TEXT NOT NULL,
          transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('wallet_to_wallet', 'wallet_to_savings', 'savings_to_wallet')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transfers_user_id ON wallet_transfers(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from_wallet ON wallet_transfers(from_wallet_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to_wallet ON wallet_transfers(to_wallet_id);
    `);

    // Create transactions table for all financial transactions
    const transactionsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
      );
    `);
    
    if (!transactionsTableExists.rows[0].exists) {
      await pool.query(`
        CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'savings', 'investment')),
          category VARCHAR(50),
          source VARCHAR(50),
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
          goal_name VARCHAR(100),
          asset_name VARCHAR(100),
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);

    // Check if budgets table exists and add user_id column if it doesn't exist
    const budgetsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets'
      );
    `);
    
    if (budgetsTableExists.rows[0].exists) {
      // Table exists, check if user_id column exists
      const userColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'budgets' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        // Add user_id column to existing table
        await pool.query(`
          ALTER TABLE budgets 
          ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        // Get the default user ID
        const defaultUser = await pool.query(`
          SELECT id FROM users WHERE email = 'default@example.com';
        `);
        
        // Update existing budgets to belong to default user
        if (defaultUser.rows.length > 0) {
          await pool.query(`
            UPDATE budgets 
            SET user_id = $1 
            WHERE user_id IS NULL;
          `, [defaultUser.rows[0].id]);
        }
        
        // Make user_id NOT NULL after updating existing data
        await pool.query(`
          ALTER TABLE budgets 
          ALTER COLUMN user_id SET NOT NULL;
        `);
        
        // Drop the old unique constraint and add new one with user_id
        await pool.query(`
          ALTER TABLE budgets 
          DROP CONSTRAINT IF EXISTS budgets_category_month_year_key;
        `);
        
        await pool.query(`
          ALTER TABLE budgets 
          ADD CONSTRAINT budgets_user_category_month_year_key 
          UNIQUE(user_id, category, month, year);
        `);
      }
    } else {
      // Create budgets table with user_id
      await pool.query(`
        CREATE TABLE budgets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category VARCHAR(100) NOT NULL,
          budget DECIMAL(10, 2) NOT NULL,
          spent DECIMAL(10, 2) DEFAULT 0,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category, month, year)
        )
      `);
    }
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON budgets(user_id, month, year);
    `);

    // Add wallet_id columns to existing tables if they don't exist (after all tables are created)
    const tablesToUpdate = ['expenses', 'income', 'savings', 'investments'];
    
    for (const tableName of tablesToUpdate) {
      // First check if the table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Table exists, check if wallet_id column exists
        const walletColumnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}' 
            AND column_name = 'wallet_id'
          );
        `);
        
        if (!walletColumnExists.rows[0].exists) {
          await pool.query(`
            ALTER TABLE ${tableName} 
            ADD COLUMN wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL;
          `);
          
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_${tableName}_wallet_id ON ${tableName}(wallet_id);
          `);
        }
      }
    }

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
  'Debt Payments',
  'Savings & Investments',
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

// User interface
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

// Expense interface
export interface Expense {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  wallet_id?: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Income interface
export interface Income {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  source: IncomeSource;
  wallet_id?: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Investment interface
export interface Investment {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  asset_name?: string;
  wallet_id?: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// User Wallet interface
export interface UserWallet {
  id: number;
  user_id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Savings interface
export interface Savings {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  goal_name?: string;
  wallet_id?: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Savings Goal interface
export interface SavingsGoal {
  id: number;
  user_id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date?: Date;
  created_at: Date;
  updated_at: Date;
}

// Budget interface
export interface Budget {
  id: number;
  user_id: number;
  category: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
  created_at: Date;
  updated_at: Date;
}

// Wallet Balance Adjustment interface
export interface WalletBalanceAdjustment {
  id: number;
  user_id: number;
  wallet_id: number;
  amount: number;
  description: string;
  adjustment_type: 'initial_balance' | 'manual_adjustment';
  created_at: Date;
  updated_at: Date;
}

// Transaction interface
export interface Transaction {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'savings' | 'investment';
  category?: string;
  source?: string;
  wallet_id?: number;
  goal_name?: string;
  asset_name?: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Wallet Transfer interface
export interface WalletTransfer {
  id: number;
  user_id: number;
  from_wallet_id?: number;
  to_wallet_id?: number;
  to_savings: boolean;
  amount: number;
  description: string;
  transfer_type: 'wallet_to_wallet' | 'wallet_to_savings' | 'savings_to_wallet';
  created_at: Date;
}

// Database operations
export class UserDatabase {
  // Create a new user
  static async createUser(email: string, passwordHash: string, name: string): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at, updated_at
    `;
    const values = [email, passwordHash, name];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User & { password_hash: string } | null> {
    const query = `
      SELECT id, email, name, password_hash, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(id: number): Promise<User | null> {
    const query = `
      SELECT id, email, name, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(id: number, updates: { name?: string; email?: string }): Promise<User> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(id: number): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export class ExpenseDatabase {
  // Create a new expense
  static async createExpense(
    userId: number,
    description: string,
    amount: number,
    category: ExpenseCategory,
    date?: Date,
    walletId?: number
  ): Promise<Expense> {
    const query = `
      INSERT INTO expenses (user_id, description, amount, category, date, wallet_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    // If no date provided or date is date-only (midnight), use current timestamp
    let finalDate = date || new Date();
    if (date && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      finalDate = new Date(); // Use current time instead of midnight
    }
    
    const values = [userId, description, amount, category, finalDate, walletId || null];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Get all expenses for a user
  static async getAllExpenses(userId: number, limit = 100, offset = 0): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expenses by date range for a user
  static async getExpensesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }
  }

  // Get expenses by category for a user
  static async getExpensesByCategory(userId: number, category: ExpenseCategory): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses 
      WHERE user_id = $1 AND category = $2
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, category]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      throw error;
    }
  }

  // Get expense summary by category for a user
  static async getExpenseSummaryByCategory(userId: number, startDate?: Date, endDate?: Date): Promise<Array<{category: string, total: number, count: number}>> {
    let query = `
      SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    
    if (startDate && endDate) {
      query += ` AND date >= $2 AND date <= $3`;
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
    userId: number,
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
    values.push(userId, id);

    const query = `
      UPDATE expenses 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
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
  static async deleteExpense(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM expenses WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
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
    userId: number,
    description: string,
    amount: number,
    source: IncomeSource,
    date?: Date,
    walletId?: number
  ): Promise<Income> {
    const query = `
      INSERT INTO income (user_id, description, amount, source, date, wallet_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    // If no date provided or date is date-only (midnight), use current timestamp
    let finalDate = date || new Date();
    if (date && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      finalDate = new Date(); // Use current time instead of midnight
    }
    
    const values = [userId, description, amount, source, finalDate, walletId || null];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating income:', error);
      throw error;
    }
  }

  // Get all income for a user
  static async getAllIncome(userId: number, limit = 100, offset = 0): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income:', error);
      throw error;
    }
  }

  // Get income by date range for a user
  static async getIncomeByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income by date range:', error);
      throw error;
    }
  }

  // Get income by source for a user
  static async getIncomeBySource(userId: number, source: IncomeSource): Promise<Income[]> {
    const query = `
      SELECT * FROM income 
      WHERE user_id = $1 AND source = $2
      ORDER BY date DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, source]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching income by source:', error);
      throw error;
    }
  }

  // Get income summary by source for a user
  static async getIncomeSummaryBySource(userId: number, startDate?: Date, endDate?: Date): Promise<Array<{source: string, total: number, count: number}>> {
    let query = `
      SELECT 
        source,
        SUM(amount) as total,
        COUNT(*) as count
      FROM income
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    
    if (startDate && endDate) {
      query += ` AND date >= $2 AND date <= $3`;
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
    userId: number,
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
    values.push(userId, id);

    const query = `
      UPDATE income 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
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
  static async deleteIncome(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM income WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting income:', error);
      throw error;
    }
  }
}

// Investment database operations
export class InvestmentDatabase {
  // Create a new investment
  static async createInvestment(
    userId: number,
    description: string,
    amount: number,
    assetName?: string,
    date?: Date,
    walletId?: number
  ): Promise<Investment> {
    const query = `
      INSERT INTO investments (user_id, description, amount, asset_name, date, wallet_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    // If no date provided or date is date-only (midnight), use current timestamp
    let finalDate = date || new Date();
    if (date && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      finalDate = new Date(); // Use current time instead of midnight
    }
    
    const values = [userId, description, amount, assetName, finalDate, walletId || null];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating investment:', error);
      throw error;
    }
  }

  // Replace all investments with a new portfolio value
  static async replaceInvestmentPortfolio(
    userId: number,
    description: string,
    amount: number,
    assetName?: string,
    date?: Date,
    walletId?: number
  ): Promise<Investment> {
    try {
      // First, delete all existing investments for this user
      await pool.query(
        'DELETE FROM investments WHERE user_id = $1',
        [userId]
      );
      
      // Then insert the new investment value
      const query = `
        INSERT INTO investments (user_id, description, amount, asset_name, date, wallet_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      // If no date provided or date is date-only (midnight), use current timestamp
      let finalDate = date || new Date();
      if (date && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        finalDate = new Date(); // Use current time instead of midnight
      }
      
      const values = [userId, description, amount, assetName, finalDate, walletId || null];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error replacing investment portfolio:', error);
      throw error;
    }
  }

  // Get all investments for a user
  static async getAllInvestments(userId: number, limit = 100, offset = 0): Promise<Investment[]> {
    const query = `
      SELECT * FROM investments 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching investments:', error);
      throw error;
    }
  }

  // Update an investment
  static async updateInvestment(
    userId: number,
    id: number,
    description?: string,
    amount?: number,
    assetName?: string,
    date?: Date
  ): Promise<Investment> {
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
    if (assetName !== undefined) {
      updates.push(`asset_name = $${paramIndex++}`);
      values.push(assetName);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);

    const query = `
      UPDATE investments 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Investment not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating investment:', error);
      throw error;
    }
  }

  // Delete an investment
  static async deleteInvestment(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM investments WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting investment:', error);
      throw error;
    }
  }
}

// Savings database operations
export class SavingsDatabase {
  // Create a new savings entry
  static async createSavings(
    userId: number,
    description: string,
    amount: number,
    goalName?: string,
    date?: Date,
    walletId?: number
  ): Promise<Savings> {
    const query = `
      INSERT INTO savings (user_id, description, amount, goal_name, date, wallet_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    // If no date provided or date is date-only (midnight), use current timestamp
    let finalDate = date || new Date();
    if (date && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      finalDate = new Date(); // Use current time instead of midnight
    }
    
    const values = [userId, description, amount, goalName, finalDate, walletId || null];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating savings:', error);
      throw error;
    }
  }

  // Get all savings for a user
  static async getAllSavings(userId: number, limit = 100, offset = 0): Promise<Savings[]> {
    const query = `
      SELECT * FROM savings 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching savings:', error);
      throw error;
    }
  }

  // Update a savings entry
  static async updateSavings(
    userId: number,
    id: number,
    description?: string,
    amount?: number,
    goalName?: string,
    date?: Date
  ): Promise<Savings> {
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
    if (goalName !== undefined) {
      updates.push(`goal_name = $${paramIndex++}`);
      values.push(goalName);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);

    const query = `
      UPDATE savings 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Savings not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating savings:', error);
      throw error;
    }
  }

  // Delete a savings entry
  static async deleteSavings(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM savings WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting savings:', error);
      throw error;
    }
  }
}

// Savings Goals database operations
export class SavingsGoalDatabase {
  // Create a new savings goal
  static async createSavingsGoal(
    userId: number,
    goalName: string,
    targetAmount: number,
    targetDate?: Date
  ): Promise<SavingsGoal> {
    const query = `
      INSERT INTO savings_goals (user_id, goal_name, target_amount, target_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [userId, goalName, targetAmount, targetDate];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating savings goal:', error);
      throw error;
    }
  }

  // Get all savings goals for a user
  static async getAllSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    const query = `
      SELECT * FROM savings_goals 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      throw error;
    }
  }

  // Update a savings goal
  static async updateSavingsGoal(
    userId: number,
    id: number,
    goalName?: string,
    targetAmount?: number,
    currentAmount?: number,
    targetDate?: Date
  ): Promise<SavingsGoal> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (goalName !== undefined) {
      updates.push(`goal_name = $${paramIndex++}`);
      values.push(goalName);
    }
    if (targetAmount !== undefined) {
      updates.push(`target_amount = $${paramIndex++}`);
      values.push(targetAmount);
    }
    if (currentAmount !== undefined) {
      updates.push(`current_amount = $${paramIndex++}`);
      values.push(currentAmount);
    }
    if (targetDate !== undefined) {
      updates.push(`target_date = $${paramIndex++}`);
      values.push(targetDate);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);

    const query = `
      UPDATE savings_goals 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Savings goal not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating savings goal:', error);
      throw error;
    }
  }

  // Delete a savings goal
  static async deleteSavingsGoal(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM savings_goals WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      throw error;
    }
  }
}

// Budget database operations
export class BudgetDatabase {
  // Create or update a budget
  static async createOrUpdateBudget(
    userId: number,
    category: string,
    budget: number,
    month: number,
    year: number
  ): Promise<Budget> {
    const query = `
      INSERT INTO budgets (user_id, category, budget, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category, month, year)
      DO UPDATE SET 
        budget = EXCLUDED.budget,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [userId, category, budget, month, year];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating/updating budget:', error);
      throw error;
    }
  }

  // Get all budgets for a user
  static async getAllBudgets(userId: number, month?: number, year?: number): Promise<Budget[]> {
    let query = `
      SELECT * FROM budgets 
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    
    if (month && year) {
      query += ` AND month = $2 AND year = $3`;
      values.push(month, year);
    }
    
    query += ` ORDER BY category`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }
  }

  // Delete a budget
  static async deleteBudget(userId: number, category: string, month: number, year: number): Promise<boolean> {
    const query = `DELETE FROM budgets WHERE user_id = $1 AND category = $2 AND month = $3 AND year = $4`;
    
    try {
      const result = await pool.query(query, [userId, category, month, year]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  }
}

// User Wallet database operations
export class UserWalletDatabase {
  // Create a new wallet
  static async createWallet(
    userId: number,
    name: string,
    type: string,
    color: string = '#10B981',
    icon: string = 'wallet'
  ): Promise<UserWallet> {
    const query = `
      INSERT INTO user_wallets (user_id, name, type, color, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, name, type, color, icon];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  // Get all wallets for a user
  static async getAllWallets(userId: number): Promise<UserWallet[]> {
    const query = `
      SELECT * FROM user_wallets 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting wallets:', error);
      throw error;
    }
  }

  // Update wallet balance
  static async updateWalletBalance(
    userId: number,
    walletId: number,
    newBalance: number
  ): Promise<UserWallet> {
    const query = `
      UPDATE user_wallets 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;
    
    console.log('updateWalletBalance called with:', {
      userId,
      walletId,
      newBalance,
      query: query.replace(/\s+/g, ' ').trim()
    });
    
    try {
      const result = await pool.query(query, [newBalance, walletId, userId]);
      console.log('updateWalletBalance query result:', {
        rowCount: result.rowCount,
        rows: result.rows
      });
      
      if (result.rows.length === 0) {
        throw new Error('Wallet not found or access denied');
      }
      
      console.log('Wallet balance updated successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  // Update wallet details
  static async updateWallet(
    userId: number,
    walletId: number,
    updates: {
      name?: string;
      type?: string;
      balance?: number;
      color?: string;
      icon?: string;
    }
  ): Promise<UserWallet> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const query = `
      UPDATE user_wallets 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const values = [walletId, userId, ...Object.values(updates)];
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Wallet not found or access denied');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  }

  // Delete wallet (soft delete)
  static async deleteWallet(userId: number, walletId: number): Promise<boolean> {
    const query = `
      UPDATE user_wallets 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;
    
    try {
      const result = await pool.query(query, [walletId, userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting wallet:', error);
      throw error;
    }
  }

  // Get total wallet balance for user (calculated from transactions)
  static async getTotalWalletBalance(userId: number): Promise<number> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN i.amount IS NOT NULL THEN i.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN e.amount IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_expenses
      FROM user_wallets w
      LEFT JOIN income i ON w.id = i.wallet_id AND i.user_id = $1
      LEFT JOIN expenses e ON w.id = e.wallet_id AND e.user_id = $1
      WHERE w.user_id = $1 AND w.is_active = true
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      const totalIncome = parseFloat(result.rows[0].total_income) || 0;
      const totalExpenses = parseFloat(result.rows[0].total_expenses) || 0;
      return totalIncome - totalExpenses;
    } catch (error) {
      console.error('Error getting total wallet balance:', error);
      throw error;
    }
  }

  // Calculate balance for a specific wallet from transactions
  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      // Get balance from new transactions table
      const transactionsQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      // Get balance from old tables (expenses and income)
      const expensesQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const incomeQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_income
        FROM income
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      // Execute all queries in parallel
      const [transactionsResult, expensesResult, incomeResult] = await Promise.all([
        pool.query(transactionsQuery, [userId, walletId]),
        pool.query(expensesQuery, [userId, walletId]),
        pool.query(incomeQuery, [userId, walletId])
      ]);
      
      // Calculate balances from both systems
      const newTransactionsBalance = parseFloat(transactionsResult.rows[0].balance) || 0;
      const oldExpenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
      const oldIncome = parseFloat(incomeResult.rows[0].total_income) || 0;
      const oldTablesBalance = oldIncome - oldExpenses;
      
      // Combine both balances (new transactions + old tables)
      const totalBalance = newTransactionsBalance + oldTablesBalance;
      
      return totalBalance;
      
    } catch (error) {
      console.error('Error calculating wallet balance:', error);
      throw error;
    }
  }

  // Get all wallets with calculated balances
  static async getAllWalletsWithBalances(userId: number): Promise<UserWallet[]> {
    const query = `
      SELECT * FROM user_wallets
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      const wallets = result.rows;
      
      // Calculate balance for each wallet
      const walletsWithBalances = await Promise.all(
        wallets.map(async (wallet) => {
          const balance = await this.calculateWalletBalance(userId, wallet.id);
          return {
            ...wallet,
            balance
          };
        })
      );
      
      return walletsWithBalances;
    } catch (error) {
      console.error('Error getting wallets with balances:', error);
      throw error;
    }
  }
}

// Wallet Balance Adjustment database operations
export class WalletBalanceAdjustmentDatabase {
  // Create a new wallet balance adjustment
  static async createAdjustment(
    userId: number,
    walletId: number,
    amount: number,
    description: string,
    adjustmentType: 'initial_balance' | 'manual_adjustment'
  ): Promise<WalletBalanceAdjustment> {
    const query = `
      INSERT INTO wallet_balance_adjustments (user_id, wallet_id, amount, description, adjustment_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, walletId, amount, description, adjustmentType];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating wallet balance adjustment:', error);
      throw error;
    }
  }

  // Get all adjustments for a wallet
  static async getWalletAdjustments(userId: number, walletId: number): Promise<WalletBalanceAdjustment[]> {
    const query = `
      SELECT * FROM wallet_balance_adjustments 
      WHERE user_id = $1 AND wallet_id = $2
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, walletId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting wallet adjustments:', error);
      throw error;
    }
  }

  // Get total adjustments for a wallet
  static async getWalletAdjustmentTotal(userId: number, walletId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total_adjustments
      FROM wallet_balance_adjustments 
      WHERE user_id = $1 AND wallet_id = $2
    `;
    
    try {
      const result = await pool.query(query, [userId, walletId]);
      return parseFloat(result.rows[0].total_adjustments) || 0;
    } catch (error) {
      console.error('Error getting wallet adjustment total:', error);
      throw error;
    }
  }
}

// Transaction database operations
export class TransactionDatabase {
  // Create a new transaction
  static async createTransaction(
    userId: number,
    description: string,
    amount: number,
    type: 'income' | 'expense' | 'transfer' | 'savings' | 'investment',
    walletId?: number,
    category?: string,
    source?: string,
    goalName?: string,
    assetName?: string,
    date?: Date
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (user_id, description, amount, type, wallet_id, category, source, goal_name, asset_name, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      userId,
      description,
      amount,
      type,
      walletId || null,
      category || null,
      source || null,
      goalName || null,
      assetName || null,
      date || new Date()
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Get all transactions for a user
  static async getUserTransactions(userId: number, limit?: number, offset?: number): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC
      ${limit ? `LIMIT ${limit}` : ''}
      ${offset ? `OFFSET ${offset}` : ''}
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  // Get transactions for a specific wallet
  static async getWalletTransactions(userId: number, walletId: number): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND wallet_id = $2
      ORDER BY date DESC, created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, walletId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      throw error;
    }
  }

  // Calculate wallet balance from transactions
  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      // Get balance from new transactions table
      const transactionsQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      // Get balance from old tables (expenses and income)
      const expensesQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const incomeQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_income
        FROM income
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      // Execute all queries in parallel
      const [transactionsResult, expensesResult, incomeResult] = await Promise.all([
        pool.query(transactionsQuery, [userId, walletId]),
        pool.query(expensesQuery, [userId, walletId]),
        pool.query(incomeQuery, [userId, walletId])
      ]);
      
      // Calculate balances from both systems
      const newTransactionsBalance = parseFloat(transactionsResult.rows[0].balance) || 0;
      const oldExpenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
      const oldIncome = parseFloat(incomeResult.rows[0].total_income) || 0;
      const oldTablesBalance = oldIncome - oldExpenses;
      
      // Combine both balances (new transactions + old tables)
      const totalBalance = newTransactionsBalance + oldTablesBalance;
      
      return totalBalance;
      
    } catch (error) {
      console.error('Error calculating wallet balance:', error);
      throw error;
    }
  }
}

// Wallet Transfer database operations
export class WalletTransferDatabase {
  // Create a new wallet transfer
  static async createTransfer(
    userId: number,
    fromWalletId: number | undefined,
    toWalletId: number | undefined,
    toSavings: boolean,
    amount: number,
    description: string,
    transferType: 'wallet_to_wallet' | 'wallet_to_savings' | 'savings_to_wallet'
  ): Promise<WalletTransfer> {
    const query = `
      INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, to_savings, amount, description, transfer_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [userId, fromWalletId, toWalletId, toSavings, amount, description, transferType];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating wallet transfer:', error);
      throw error;
    }
  }

  // Get all transfers for a user
  static async getUserTransfers(userId: number): Promise<WalletTransfer[]> {
    const query = `
      SELECT * FROM wallet_transfers 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user transfers:', error);
      throw error;
    }
  }

  // Get transfers for a specific wallet
  static async getWalletTransfers(userId: number, walletId: number): Promise<WalletTransfer[]> {
    const query = `
      SELECT * FROM wallet_transfers 
      WHERE user_id = $1 AND (from_wallet_id = $2 OR to_wallet_id = $2)
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, walletId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting wallet transfers:', error);
      throw error;
    }
  }
}

export default pool;
