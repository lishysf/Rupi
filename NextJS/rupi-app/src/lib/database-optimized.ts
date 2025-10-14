import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Clean, optimized database initialization
export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing CLEAN, optimized database...');
    
    // Drop ALL existing tables to start fresh
    console.log('🗑️ Dropping all existing tables for clean start...');
    await pool.query('DROP TABLE IF EXISTS wallet_transfers CASCADE');
    await pool.query('DROP TABLE IF EXISTS wallet_balance_adjustments CASCADE');
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS budgets CASCADE');
    await pool.query('DROP TABLE IF EXISTS savings_goals CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_wallets CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS migration_log CASCADE');
    console.log('✅ All tables dropped for clean start');

    // Create users table
    console.log('👤 Creating users table...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_wallets table (optimized - no redundant balance column)
    console.log('💳 Creating user_wallets table...');
    await pool.query(`
      CREATE TABLE user_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'bank',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create unified transactions table (main table - handles ALL financial operations)
    console.log('💰 Creating unified transactions table...');
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
        transfer_type VARCHAR(50), -- For wallet transfers: 'wallet_to_wallet', 'wallet_to_savings', 'savings_to_wallet'
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create savings_goals table (optimized - no redundant current_amount column)
    console.log('🎯 Creating savings_goals table...');
    await pool.query(`
      CREATE TABLE savings_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_name VARCHAR(150) NOT NULL,
        target_amount DECIMAL(10, 2) NOT NULL,
        target_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create budgets table (optimized - no redundant spent column)
    console.log('📊 Creating budgets table...');
    await pool.query(`
      CREATE TABLE budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category, month, year)
      )
    `);

    // Create migration_log table
    console.log('📝 Creating migration_log table...');
    await pool.query(`
      CREATE TABLE migration_log (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create optimized indexes for performance
    console.log('📈 Creating optimized indexes...');
    
    // User indexes
    await pool.query(`CREATE INDEX idx_users_email ON users(email)`);
    
    // Wallet indexes
    await pool.query(`CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id)`);
    await pool.query(`CREATE INDEX idx_user_wallets_type ON user_wallets(type)`);
    
    // Transaction indexes (most important)
    await pool.query(`CREATE INDEX idx_transactions_user_id ON transactions(user_id)`);
    await pool.query(`CREATE INDEX idx_transactions_type ON transactions(type)`);
    await pool.query(`CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id)`);
    await pool.query(`CREATE INDEX idx_transactions_date ON transactions(date)`);
    await pool.query(`CREATE INDEX idx_transactions_user_type ON transactions(user_id, type)`);
    await pool.query(`CREATE INDEX idx_transactions_user_wallet ON transactions(user_id, wallet_id)`);
    await pool.query(`CREATE INDEX idx_transactions_transfer_type ON transactions(transfer_type) WHERE transfer_type IS NOT NULL`);
    await pool.query(`CREATE INDEX idx_transactions_category_balance_adjustment ON transactions(category) WHERE category = 'balance_adjustment'`);
    
    // Savings and budget indexes
    await pool.query(`CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id)`);
    await pool.query(`CREATE INDEX idx_budgets_user_id ON budgets(user_id)`);

    console.log('✅ Clean database initialization completed successfully!');
    console.log('');
    console.log('📊 Optimized Database Structure:');
    console.log('✅ users - User accounts');
    console.log('✅ user_wallets - User wallets (no redundant balance column)');
    console.log('✅ transactions - UNIFIED table for ALL financial operations');
    console.log('✅ savings_goals - Savings goals (no redundant current_amount column)');
    console.log('✅ budgets - Budgets (no redundant spent column)');
    console.log('✅ migration_log - Migration tracking');
    console.log('');
    console.log('🚀 Benefits:');
    console.log('✅ No data redundancy');
    console.log('✅ Single source of truth (transactions table)');
    console.log('✅ Better performance with optimized indexes');
    console.log('✅ Clean, unified structure');
    console.log('✅ All wallet operations handled by transactions table');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Interfaces
export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserWallet {
  id: number;
  user_id: number;
  name: string;
  type: string;
  created_at: Date;
  updated_at: Date;
  // Balance is calculated dynamically from transactions
  balance?: number; // Optional, calculated when needed
}

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
  transfer_type?: 'wallet_to_wallet' | 'wallet_to_savings' | 'savings_to_wallet';
  date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  goal_name: string;
  target_amount: number;
  target_date?: Date;
  created_at: Date;
  updated_at: Date;
  // Current amount is calculated dynamically from transactions
  current_amount?: number; // Optional, calculated when needed
  progress_percentage?: number; // Optional, calculated when needed
}

export interface Budget {
  id: number;
  user_id: number;
  category: string;
  amount: number;
  month: number;
  year: number;
  created_at: Date;
  updated_at: Date;
  // Spent amount is calculated dynamically from transactions
  spent?: number; // Optional, calculated when needed
  spent_percentage?: number; // Optional, calculated when needed
}

// Database classes
export class UserDatabase {
  static async createUser(email: string, passwordHash: string, name: string): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING *
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

  static async getUserByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1`;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  static async getUserById(id: number): Promise<User | null> {
    const query = `SELECT * FROM users WHERE id = $1`;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      throw error;
    }
  }
}

export class UserWalletDatabase {
  static async createWallet(userId: number, name: string, type: string): Promise<UserWallet> {
    const query = `
      INSERT INTO user_wallets (user_id, name, type)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [userId, name, type];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  static async getAllWallets(userId: number): Promise<UserWallet[]> {
    const query = `
      SELECT * FROM user_wallets 
      WHERE user_id = $1
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

  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      const query = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              WHEN type = 'savings' THEN amount
              WHEN type = 'investment' THEN 0
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const result = await pool.query(query, [userId, walletId]);
      return parseFloat(result.rows[0].balance) || 0;
    } catch (error) {
      console.error('Error calculating wallet balance:', error);
      throw error;
    }
  }
}

export class TransactionDatabase {
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
    transferType?: 'wallet_to_wallet' | 'wallet_to_savings' | 'savings_to_wallet',
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
      return result.rows[0];
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

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

  static async calculateWalletBalance(userId: number, walletId: number): Promise<number> {
    try {
      const query = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN type = 'income' OR type = 'transfer' THEN amount
              WHEN type = 'expense' THEN -amount
              WHEN type = 'savings' THEN amount
              WHEN type = 'investment' THEN 0
              ELSE 0
            END
          ), 0) as balance
        FROM transactions
        WHERE user_id = $1 AND wallet_id = $2
      `;
      
      const result = await pool.query(query, [userId, walletId]);
      return parseFloat(result.rows[0].balance) || 0;
    } catch (error) {
      console.error('Error calculating wallet balance:', error);
      throw error;
    }
  }

  // Wallet transfer methods using unified transaction system
  static async createWalletTransfer(
    userId: number,
    fromWalletId: number,
    toWalletId: number,
    amount: number,
    description: string
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create "from" transaction (negative amount)
      const fromTransaction = await this.createTransaction(
        userId,
        `Transfer to wallet: ${description}`,
        -amount,
        'transfer',
        fromWalletId,
        undefined,
        undefined,
        undefined,
        undefined,
        'wallet_to_wallet'
      );

      // Create "to" transaction (positive amount)
      const toTransaction = await this.createTransaction(
        userId,
        `Transfer from wallet: ${description}`,
        amount,
        'transfer',
        toWalletId,
        undefined,
        undefined,
        undefined,
        undefined,
        'wallet_to_wallet'
      );

      await client.query('COMMIT');
      return { fromTransaction, toTransaction };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async createWalletToSavingsTransfer(
    userId: number,
    fromWalletId: number,
    amount: number,
    description: string,
    goalName: string
  ): Promise<Transaction> {
    return await this.createTransaction(
      userId,
      `Transfer to savings: ${description}`,
      amount,
      'savings',
      fromWalletId,
      undefined,
      undefined,
      goalName,
      undefined,
      'wallet_to_savings'
    );
  }

  static async createSavingsToWalletTransfer(
    userId: number,
    toWalletId: number,
    amount: number,
    description: string,
    goalName: string
  ): Promise<Transaction> {
    return await this.createTransaction(
      userId,
      `Transfer from savings: ${description}`,
      -amount, // Negative for withdrawal
      'savings',
      toWalletId,
      undefined,
      undefined,
      goalName,
      undefined,
      'savings_to_wallet'
    );
  }

  static async getWalletTransfers(userId: number): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND type = 'transfer'
      ORDER BY date DESC, created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting wallet transfers:', error);
      throw error;
    }
  }
}

export class SavingsGoalDatabase {
  static async createGoal(
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
    const values = [userId, goalName, targetAmount, targetDate || null];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating savings goal:', error);
      throw error;
    }
  }

  static async getUserGoals(userId: number): Promise<SavingsGoal[]> {
    const query = `
      SELECT * FROM savings_goals 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user goals:', error);
      throw error;
    }
  }
}

export class BudgetDatabase {
  static async createBudget(
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
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [userId, category, amount, month, year];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  static async getUserBudgets(userId: number, month?: number, year?: number): Promise<Budget[]> {
    let query = `SELECT * FROM budgets WHERE user_id = $1`;
    const values: any[] = [userId];
    
    if (month && year) {
      query += ` AND month = $2 AND year = $3`;
      values.push(month, year);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting user budgets:', error);
      throw error;
    }
  }
}

export default pool;
