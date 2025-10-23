import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// CLEAN database initialization - NO redundant tables
export async function initializeDatabase() {
  try {
    console.log('🚀 Initializing CLEAN, optimized database...');
    
    // Drop ALL existing tables to start fresh
    console.log('🗑️ Dropping all existing tables for clean start...');
    await pool.query('DROP TABLE IF EXISTS wallet_transfers CASCADE');
    await pool.query('DROP TABLE IF EXISTS wallet_balance_adjustments CASCADE');
    await pool.query('DROP TABLE IF EXISTS expenses CASCADE');
    await pool.query('DROP TABLE IF EXISTS income CASCADE');
    await pool.query('DROP TABLE IF EXISTS savings CASCADE');
    await pool.query('DROP TABLE IF EXISTS investments CASCADE');
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
      CREATE TABLE transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
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

    // Create daily_assets table for tracking asset snapshots
    console.log('📈 Creating daily_assets table...');
    await pool.query(`
      CREATE TABLE daily_assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        savings_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_assets DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
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
    
    // Daily assets indexes
    await pool.query(`CREATE INDEX idx_daily_assets_user_id ON daily_assets(user_id)`);
    await pool.query(`CREATE INDEX idx_daily_assets_date ON daily_assets(date)`);
    await pool.query(`CREATE INDEX idx_daily_assets_user_date ON daily_assets(user_id, date)`);

    console.log('✅ Clean database initialization completed successfully!');
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

export default pool;
