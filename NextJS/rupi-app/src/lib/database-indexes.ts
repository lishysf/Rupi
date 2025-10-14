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

// Create database indexes for performance optimization
export async function createDatabaseIndexes() {
  try {
    console.log('🚀 Creating database indexes for performance optimization...');
    
    // Index for transactions table - user_id and wallet_id (most common queries)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_wallet 
      ON transactions (user_id, wallet_id)
    `);
    console.log('✅ Created index: idx_transactions_user_wallet');
    
    // Index for transactions table - user_id and type (for filtering by transaction type)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
      ON transactions (user_id, type)
    `);
    console.log('✅ Created index: idx_transactions_user_type');
    
    // Index for transactions table - user_id and date (for date-based queries)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
      ON transactions (user_id, date DESC)
    `);
    console.log('✅ Created index: idx_transactions_user_date');
    
    // Index for transactions table - wallet_id (for wallet-specific queries)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id 
      ON transactions (wallet_id)
    `);
    console.log('✅ Created index: idx_transactions_wallet_id');
    
    // Index for user_wallets table - user_id (for user wallet queries)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id 
      ON user_wallets (user_id)
    `);
    console.log('✅ Created index: idx_user_wallets_user_id');
    
    // Index for transactions table - composite index for balance calculations
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_balance_calc 
      ON transactions (user_id, wallet_id, type, amount)
    `);
    console.log('✅ Created index: idx_transactions_balance_calc');
    
    console.log('🎉 All database indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}

// Analyze table statistics for query optimization
export async function analyzeTableStatistics() {
  try {
    console.log('📊 Analyzing table statistics for query optimization...');
    
    // Analyze transactions table
    await pool.query('ANALYZE transactions');
    console.log('✅ Analyzed transactions table');
    
    // Analyze user_wallets table
    await pool.query('ANALYZE user_wallets');
    console.log('✅ Analyzed user_wallets table');
    
    // Analyze users table
    await pool.query('ANALYZE users');
    console.log('✅ Analyzed users table');
    
    console.log('🎉 Table statistics analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing table statistics:', error);
    throw error;
  }
}

// Get query performance statistics
export async function getQueryPerformanceStats() {
  try {
    console.log('📈 Getting query performance statistics...');
    
    // Get slow queries
    const slowQueries = await pool.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > 100 
      ORDER BY mean_time DESC 
      LIMIT 10
    `);
    
    if (slowQueries.rows.length > 0) {
      console.log('🐌 Slow queries detected:');
      slowQueries.rows.forEach((query, index) => {
        console.log(`${index + 1}. ${query.query.substring(0, 100)}... (${query.mean_time}ms avg)`);
      });
    } else {
      console.log('✅ No slow queries detected');
    }
    
    // Get table sizes
    const tableSizes = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    console.log('📊 Table sizes:');
    tableSizes.rows.forEach(table => {
      console.log(`  ${table.tablename}: ${table.size}`);
    });
    
  } catch (error) {
    console.error('❌ Error getting query performance stats:', error);
    // This is optional, don't throw error
  }
}

// Optimize database connection pool
export function optimizeConnectionPool() {
  console.log('🔧 Optimizing database connection pool...');
  
  // These settings should be in your database configuration
  const optimizedConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rupi_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Connection pool optimization
    max: 20, // Maximum number of clients in the pool
    min: 5,  // Minimum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  };
  
  console.log('✅ Connection pool optimization settings:');
  console.log(`  Max connections: ${optimizedConfig.max}`);
  console.log(`  Min connections: ${optimizedConfig.min}`);
  console.log(`  Idle timeout: ${optimizedConfig.idleTimeoutMillis}ms`);
  console.log(`  Connection timeout: ${optimizedConfig.connectionTimeoutMillis}ms`);
  
  return optimizedConfig;
}
