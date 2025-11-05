import { Pool } from 'pg';

// Database configuration - supports both direct PostgreSQL and Supabase PostgreSQL
// Prioritize DATABASE_URL (recommended for Vercel/serverless) over individual env vars
let pool: Pool;

if (process.env.DATABASE_URL) {
  // Use connection string (recommended for Vercel and Supabase connection pooling)
  const connectionString = process.env.DATABASE_URL;
  
  pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Optimize for serverless
    max: 1, // Reduce connection pool size for serverless
    idleTimeoutMillis: 10000, // Close idle connections quickly
    connectionTimeoutMillis: 10000, // Fail fast
  });
} else if (process.env.SUPABASE_DB_PASSWORD) {
  // Legacy: Use individual Supabase env vars (fallback)
  // Note: For Vercel, you should use DATABASE_URL with connection pooling instead
  const supabaseUrl = process.env.SUPABASE_DB_HOST || 'db.thkdrlozedfysuukvwmd.supabase.co';
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  
  pool = new Pool({
    host: supabaseUrl,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabasePassword,
    ssl: { rejectUnauthorized: false },
    // Optimize for serverless
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
} else {
  // Use direct PostgreSQL connection (local development)
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rupi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache TTL
const WALLET_BALANCE_CACHE_TTL = 5000; // 5 seconds cache TTL for wallet balances

// Cache helper functions
function getCachedData(key: string, ttl: number = CACHE_TTL): unknown {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// CLEAN database initialization - NO redundant tables
export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database (preserving existing data)...');
    
    // Drop only OLD redundant tables, keep current optimized tables
    console.log('🗑️ Dropping old redundant tables...');
    await pool.query('DROP TABLE IF EXISTS wallet_transfers CASCADE');
    await pool.query('DROP TABLE IF EXISTS wallet_balance_adjustments CASCADE');
    await pool.query('DROP TABLE IF EXISTS expenses CASCADE');
    await pool.query('DROP TABLE IF EXISTS income CASCADE');
    await pool.query('DROP TABLE IF EXISTS savings CASCADE');
    await pool.query('DROP TABLE IF EXISTS investments CASCADE');
    await pool.query('DROP TABLE IF EXISTS migration_log CASCADE');
    console.log('✅ Old redundant tables dropped, current tables preserved');

    // Create users table (if not exists)
    console.log('👤 Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        -- optional flag to indicate onboarding completion
        onboarding_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure column exists for pre-existing deployments
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`);

    // Create user_wallets table (optimized - no redundant balance column)
    console.log('💳 Creating user_wallets table...');
      await pool.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'bank',
          color VARCHAR(7) DEFAULT '#10B981',
          icon VARCHAR(50) DEFAULT 'wallet',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    
    // Create unified transactions table (handles ALL financial operations)
    console.log('💰 Creating unified transactions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'savings')),
        category VARCHAR(50),
        source VARCHAR(50),
          wallet_id INTEGER REFERENCES user_wallets(id) ON DELETE SET NULL,
        goal_name VARCHAR(100),
        asset_name VARCHAR(100),
        transfer_type VARCHAR(50), -- For wallet transfers: 'wallet_to_wallet', 'wallet_to_savings', 'savings_to_wallet'
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

    // Create savings_goals table (optimized - no redundant current_amount column)
    console.log('🎯 Creating savings_goals table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          goal_name VARCHAR(150) NOT NULL,
          target_amount DECIMAL(10, 2) NOT NULL,
          allocated_amount DECIMAL(10, 2) DEFAULT 0,
          target_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    
    // Create budgets table (optimized - no redundant spent column)
    console.log('📊 Creating budgets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category VARCHAR(100) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category, month, year)
        )
      `);


    // Create daily_assets table for tracking asset snapshots
    console.log('📈 Creating daily_assets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        wallet_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
        savings_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
        total_assets DECIMAL(15, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // Create user_profiles table for onboarding details
    console.log('🧩 Creating user_profiles table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        display_name VARCHAR(255),
        currency VARCHAR(10),
        occupation VARCHAR(255),
        financial_goal_target DECIMAL(15, 2),
        discovery_source VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_preferences table
    console.log('⚙️ Creating user_preferences table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_consents table
    console.log('✅ Creating user_consents table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        accepted_terms BOOLEAN DEFAULT false,
        accepted_privacy BOOLEAN DEFAULT false,
        consent_financial_analysis BOOLEAN DEFAULT false,
        accepted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create migration_log table
    console.log('📝 Creating migration_log table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_log (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create optimized indexes for performance
    console.log('📈 Creating optimized indexes...');
    
    // User indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    
    // Wallet indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_wallets_type ON user_wallets(type)`);
    
    // Transaction indexes (most important)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_wallet ON transactions(user_id, wallet_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_transfer_type ON transactions(transfer_type) WHERE transfer_type IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_category_balance_adjustment ON transactions(category) WHERE category = 'balance_adjustment'`);
    
    // Savings and budget indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)`);
    
    // Daily assets indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_assets_user_id ON daily_assets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_assets_date ON daily_assets(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_assets_user_date ON daily_assets(user_id, date)`);

    // Profiles and preferences indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_currency ON user_profiles(currency)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_goal ON user_profiles(financial_goal_target)`);

    // Note: Daily assets are calculated on-demand, not pre-populated

    console.log('✅ Database initialization completed successfully!');
    console.log('');
    console.log('📊 Optimized Database Structure (7 Tables Only):');
    console.log('✅ users - User accounts');
    console.log('✅ user_wallets - User wallets (no redundant balance column)');
    console.log('✅ transactions - UNIFIED table for ALL financial operations');
    console.log('✅ savings_goals - Savings goals (no redundant current_amount column)');
    console.log('✅ budgets - Budgets (no redundant spent column)');
    console.log('✅ daily_assets - Daily asset snapshots for trends');
    console.log('✅ migration_log - Migration tracking');
    console.log('');
    console.log('🚀 Benefits:');
    console.log('✅ No data redundancy');
    console.log('✅ Single source of truth (transactions table)');
    console.log('✅ Better performance with optimized indexes');
    console.log('✅ Clean, unified structure');
    console.log('✅ All financial operations handled by transactions table');
    console.log('');
    console.log('❌ REMOVED REDUNDANT TABLES:');
    console.log('❌ expenses (redundant with transactions)');
    console.log('❌ income (redundant with transactions)');
    console.log('❌ savings (redundant with transactions)');
    console.log('❌ investments (redundant with transactions)');
    console.log('❌ wallet_transfers (redundant with transactions)');
    console.log('❌ wallet_balance_adjustments (redundant with transactions)');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Expense categories
export const EXPENSE_CATEGORIES = [
  // Housing & Utilities
  'Rent',
  'Mortgage',
  'Electricity',
  'Water',
  'Internet',
  'Gas Utility',
  'Home Maintenance',
  'Household Supplies',

  // Food & Dining
  'Groceries',
  'Dining Out',
  'Coffee & Tea',
  'Food Delivery',

  // Transportation
  'Fuel',
  'Parking',
  'Public Transport',
  'Ride Hailing',
  'Vehicle Maintenance',
  'Toll',

  // Health & Personal
  'Medical & Pharmacy',
  'Health Insurance',
  'Fitness',
  'Personal Care',

  // Entertainment & Shopping
  'Clothing',
  'Electronics & Gadgets',
  'Subscriptions & Streaming',
  'Hobbies & Leisure',
  'Gifts & Celebration',

  // Financial Obligations
  'Debt Payments',
  'Taxes & Fees',
  'Bank Charges',

  // Family & Education
  'Childcare',
  'Education',
  'Pets',

  // Miscellaneous
  'Travel',
  'Business Expenses',
  'Charity & Donations',
  'Emergency',
  'Others'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Income sources
export const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business Revenue',
  'Interest',
  'Capital Gains',
  'Rental Income',
  'Bonus',
  'Commission',
  'Gift',
  'Refund',
  'Others'
] as const;

export type IncomeSource = typeof INCOME_SOURCES[number];

// User interface
export interface User {
  id: number;
  email: string;
  name: string;
  onboarding_completed?: boolean;
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
  allocated_amount: number;
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
  amount: number;
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
  type: 'income' | 'expense' | 'transfer' | 'savings';
  category?: string;
  source?: string;
  wallet_id?: number;
  goal_name?: string;
  asset_name?: string;
  transfer_type?: string;
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

  // Create a new OAuth user (without password)
  // Uses a special marker value to indicate OAuth authentication
  static async createOAuthUser(email: string, name: string): Promise<User> {
    // Use a special marker that indicates OAuth authentication
    // This value won't match any real bcrypt hash (which start with $2a$, $2b$, or $2y$)
    const oauthMarker = 'OAUTH_USER_NO_PASSWORD';
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at, updated_at
    `;
    const values = [email, oauthMarker, name];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating OAuth user:', error);
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
      SELECT id, email, name, onboarding_completed, created_at, updated_at
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
    const values: unknown[] = [];
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



// Income database operations


// Savings database operations


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

  // Get all savings goals for a user with calculated current amounts
  static async getAllSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    const query = `
      SELECT 
        sg.*,
        COALESCE(SUM(t.amount), 0) as current_amount
      FROM savings_goals sg
      LEFT JOIN transactions t ON t.user_id = sg.user_id 
        AND t.type = 'savings' 
        AND t.goal_name = sg.goal_name
      WHERE sg.user_id = $1
      GROUP BY sg.id, sg.user_id, sg.goal_name, sg.target_amount, sg.allocated_amount, sg.target_date, sg.created_at, sg.updated_at
      ORDER BY sg.created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        current_amount: parseFloat(row.current_amount) || 0
      }));
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      throw error;
    }
  }

  // Update a savings goal (current_amount is calculated dynamically, not stored)
  static async updateSavingsGoal(
    userId: number,
    id: number,
    goalName?: string,
    targetAmount?: number,
    targetDate?: Date
  ): Promise<SavingsGoal> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (goalName !== undefined) {
      updates.push(`goal_name = $${paramIndex++}`);
      values.push(goalName);
    }
    if (targetAmount !== undefined) {
      updates.push(`target_amount = $${paramIndex++}`);
      values.push(targetAmount);
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
      
      // Calculate current amount from transactions
      const currentAmountQuery = `
        SELECT COALESCE(SUM(amount), 0) as current_amount
        FROM transactions
        WHERE user_id = $1 AND type = 'savings' AND goal_name = $2
      `;
      const currentAmountResult = await pool.query(currentAmountQuery, [userId, result.rows[0].goal_name]);
      
      return {
        ...result.rows[0],
        current_amount: parseFloat(currentAmountResult.rows[0].current_amount) || 0
      };
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
    amount: number,
    month: number,
    year: number
  ): Promise<Budget> {
    const query = `
      INSERT INTO budgets (user_id, category, amount, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category, month, year)
      DO UPDATE SET 
        amount = EXCLUDED.amount,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [userId, category, amount, month, year];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating/updating budget:', error);
      throw error;
    }
  }

  // Get all budgets for a user with calculated spent amounts
  static async getAllBudgets(userId: number, month?: number, year?: number): Promise<Budget[]> {
    let query = `
      SELECT 
        b.*,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON t.user_id = b.user_id 
        AND t.type = 'expense' 
        AND t.category = b.category
        AND EXTRACT(MONTH FROM t.date) = b.month
        AND EXTRACT(YEAR FROM t.date) = b.year
      WHERE b.user_id = $1
    `;
    const values: (number | string)[] = [userId];
    
    if (month && year) {
      query += ` AND b.month = $2 AND b.year = $3`;
      values.push(month, year);
    }
    
    query += ` GROUP BY b.id, b.user_id, b.category, b.amount, b.month, b.year, b.created_at, b.updated_at
               ORDER BY b.category`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows.map(row => ({
        ...row,
        spent: parseFloat(row.spent) || 0
      }));
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

  // Calculate balance for a specific wallet from transactions (unified system only) with caching
  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      // Check cache first
      const cacheKey = `wallet_balance_${userId}_${walletId}`;
      const cachedBalance = getCachedData(cacheKey, WALLET_BALANCE_CACHE_TTL);
      if (cachedBalance !== null) {
        return cachedBalance as number;
      }
      
      // Optimized query with proper indexing
      const transactionsQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              WHEN type = 'savings' THEN -amount  -- Savings transfers REDUCE wallet balance (money goes to savings)
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const result = await pool.query(transactionsQuery, [userId, walletId]);
      const balance = parseFloat(result.rows[0].balance) || 0;
      
      // Cache the result for 10 seconds (shorter TTL for balance calculations)
      setCachedData(cacheKey, balance);
      
      return balance;
      
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
    transferType?: string,
    date?: Date
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (user_id, description, amount, type, wallet_id, category, source, goal_name, asset_name, transfer_type, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      transferType || null,
      date || new Date()
    ];
    
    try {
      const result = await pool.query(query, values);
      
      // Invalidate cache for this user
      const cacheKeys = Array.from(cache.keys()).filter(key => key.startsWith(`transactions_${userId}_`));
      cacheKeys.forEach(key => cache.delete(key));
      
      // Also invalidate wallet balance cache for this user
      const walletBalanceCacheKeys = Array.from(cache.keys()).filter(key => key.startsWith(`wallet_balance_${userId}_`));
      walletBalanceCacheKeys.forEach(key => cache.delete(key));
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Get all transactions for a user with caching
  static async getUserTransactions(userId: number, limit?: number, offset?: number): Promise<Transaction[]> {
    // Create cache key
    const cacheKey = `transactions_${userId}_${limit || 'all'}_${offset || 0}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData as Transaction[];
    }
    
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1
      ORDER BY date DESC, created_at DESC
      ${limit ? `LIMIT ${limit}` : ''}
      ${offset ? `OFFSET ${offset}` : ''}
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      const transactions = result.rows;
      
      // Cache the result
      setCachedData(cacheKey, transactions);
      
      return transactions;
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

  // Calculate wallet balance from transactions (unified system) with caching
  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      // Check cache first
      const cacheKey = `wallet_balance_${userId}_${walletId}`;
      const cachedBalance = getCachedData(cacheKey, WALLET_BALANCE_CACHE_TTL);
      if (cachedBalance !== null) {
        return cachedBalance as number;
      }
      
      // Optimized query with proper indexing
      const transactionsQuery = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              WHEN type = 'savings' THEN amount  -- Savings deposits/withdrawals affect wallet balance
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const result = await pool.query(transactionsQuery, [userId, walletId]);
      const balance = parseFloat(result.rows[0].balance) || 0;
      
      // Cache the result for 10 seconds (shorter TTL for balance calculations)
      setCachedData(cacheKey, balance);
      
      return balance;
      
    } catch (error) {
      console.error('Error calculating wallet balance:', error);
      throw error;
    }
  }

  // Update a transaction
  static async updateTransaction(
    userId: number,
    id: number,
    description?: string,
    amount?: number,
    type?: 'income' | 'expense' | 'transfer' | 'savings' | 'investment',
    walletId?: number,
    category?: string,
    source?: string,
    goalName?: string,
    assetName?: string,
    transferType?: string,
    date?: Date
  ): Promise<Transaction> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (walletId !== undefined) {
      updates.push(`wallet_id = $${paramIndex++}`);
      values.push(walletId);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(source);
    }
    if (goalName !== undefined) {
      updates.push(`goal_name = $${paramIndex++}`);
      values.push(goalName);
    }
    if (assetName !== undefined) {
      updates.push(`asset_name = $${paramIndex++}`);
      values.push(assetName);
    }
    if (transferType !== undefined) {
      updates.push(`transfer_type = $${paramIndex++}`);
      values.push(transferType);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);

    const query = `
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }
      // Invalidate caches for this user after update
      const updated = result.rows[0];
      const cacheKeysToDelete = Array.from(cache.keys()).filter(key => key.startsWith(`transactions_${userId}_`));
      cacheKeysToDelete.forEach(key => cache.delete(key));
      const walletBalanceCacheKeysToDelete = Array.from(cache.keys()).filter(key => key.startsWith(`wallet_balance_${userId}_`));
      walletBalanceCacheKeysToDelete.forEach(key => cache.delete(key));
      return result.rows[0];
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete a transaction
  static async deleteTransaction(userId: number, id: number): Promise<boolean> {
    const query = `DELETE FROM transactions WHERE user_id = $1 AND id = $2`;
    
    try {
      const result = await pool.query(query, [userId, id]);
      const deleted = result.rowCount !== null && result.rowCount > 0;
      if (deleted) {
        // Invalidate caches for this user after delete
        const cacheKeysToDelete = Array.from(cache.keys()).filter(key => key.startsWith(`transactions_${userId}_`));
        cacheKeysToDelete.forEach(key => cache.delete(key));
        const walletBalanceCacheKeysToDelete = Array.from(cache.keys()).filter(key => key.startsWith(`wallet_balance_${userId}_`));
        walletBalanceCacheKeysToDelete.forEach(key => cache.delete(key));
      }
      return deleted;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
}

// Wallet Transfer database operations


// Note: EXPENSE_CATEGORIES and INCOME_SOURCES are already defined above

// Function to populate daily assets data for existing users
async function populateDailyAssetsData() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id FROM users');
    const users = usersResult.rows;
    
    if (users.length === 0) {
      console.log('📊 No users found, skipping daily assets population');
      return;
    }
    
    console.log(`📊 Found ${users.length} users, populating daily assets data...`);
    
    for (const user of users) {
      const userId = user.id;
      
      // Get the date range for this user (from first transaction to today)
      const dateRangeResult = await pool.query(`
        SELECT 
          MIN(DATE(date)) as start_date,
          MAX(DATE(date)) as end_date
        FROM transactions 
        WHERE user_id = $1
      `, [userId]);
      
      if (dateRangeResult.rows.length === 0 || !dateRangeResult.rows[0].start_date) {
        console.log(`📊 No transactions found for user ${userId}, skipping`);
        continue;
      }
      
      const startDate = dateRangeResult.rows[0].start_date;
      const endDate = dateRangeResult.rows[0].end_date || new Date().toISOString().split('T')[0];
      
      console.log(`📊 Populating daily assets for user ${userId} from ${startDate} to ${endDate}`);
      
      // Generate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        
        // Calculate daily assets for this date
        const dailyAssets = await calculateDailyAssetsForDate(userId, dateString);
        
        if (dailyAssets) {
          // Insert or update daily asset snapshot
          await pool.query(`
            INSERT INTO daily_assets (user_id, date, wallet_balance, savings_total, total_assets)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, date)
            DO UPDATE SET
              wallet_balance = EXCLUDED.wallet_balance,
              savings_total = EXCLUDED.savings_total,
              total_assets = EXCLUDED.total_assets,
              updated_at = CURRENT_TIMESTAMP
          `, [userId, dateString, dailyAssets.wallet_balance, dailyAssets.savings_total, dailyAssets.total_assets]);
        }
      }
    }
    
    console.log('✅ Daily assets data populated successfully!');
  } catch (error) {
    console.error('❌ Error populating daily assets data:', error);
  }
}

// Helper function to calculate daily assets for a specific date
async function calculateDailyAssetsForDate(userId: number, date: string) {
  try {
    // Get user wallets
    const walletsResult = await pool.query(`
      SELECT id
      FROM user_wallets
      WHERE user_id = $1 AND is_active = true
    `, [userId]);
    
    const wallets = walletsResult.rows;
    
    // Calculate total wallet balance from transactions up to this date
    let totalWalletBalance = 0;
    for (const wallet of wallets) {
      const walletBalanceResult = await pool.query(`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              WHEN type = 'savings' THEN -amount  -- Savings transfers REDUCE wallet balance
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2 AND DATE(date) <= $3
      `, [userId, wallet.id, date]);
      
      const walletBalance = parseFloat(walletBalanceResult.rows[0].balance) || 0;
      totalWalletBalance += walletBalance;
    }
    
    // Calculate total savings from transactions up to this date
    const savingsResult = await pool.query(`
      SELECT SUM(amount) as total_savings
      FROM transactions
      WHERE user_id = $1 AND type = 'savings' AND DATE(date) <= $2
    `, [userId, date]);
    
    const totalSavings = parseFloat(savingsResult.rows[0]?.total_savings || '0');
    
    // Calculate total assets (wallet balance + savings)
    const totalAssets = totalWalletBalance + totalSavings;
    
    return {
      wallet_balance: totalWalletBalance,
      savings_total: totalSavings,
      total_assets: totalAssets
    };
  } catch (error) {
    console.error('Error calculating daily assets for date:', error);
    return null;
  }
}

export { pool };
export default pool;
