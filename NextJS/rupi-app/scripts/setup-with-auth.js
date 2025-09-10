const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rupi_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function setupWithAuth() {
  try {
    console.log('🚀 Setting up Rupi database with authentication...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Create users table first
    console.log('👤 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table with user_id
    console.log('💸 Creating expenses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create income table with user_id
    console.log('💰 Creating income table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS income (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        source VARCHAR(100) NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create investments table with user_id
    console.log('📈 Creating investments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        asset_name VARCHAR(150),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create savings table with user_id
    console.log('💎 Creating savings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS savings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        goal_name VARCHAR(150),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create savings_goals table with user_id
    console.log('🎯 Creating savings_goals table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
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

    // Create budgets table with user_id
    console.log('📊 Creating budgets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
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

    // Create indexes
    console.log('🗂️ Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(date);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);`);

    // Create a default user for any existing data (if needed)
    console.log('👤 Creating default user...');
    await client.query(`
      INSERT INTO users (email, password_hash, name) 
      VALUES ('default@example.com', '$2a$12$default.hash.for.existing.data', 'Default User')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Display table info
    const [expenseResult, incomeResult, savingsResult, savingsGoalsResult, budgetResult, userResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM expenses'),
      client.query('SELECT COUNT(*) as count FROM income'),
      client.query('SELECT COUNT(*) as count FROM savings'),
      client.query('SELECT COUNT(*) as count FROM savings_goals'),
      client.query('SELECT COUNT(*) as count FROM budgets'),
      client.query('SELECT COUNT(*) as count FROM users')
    ]);
    
    console.log(`👤 Total users in database: ${userResult.rows[0].count}`);
    console.log(`💸 Total expenses in database: ${expenseResult.rows[0].count}`);
    console.log(`💰 Total income in database: ${incomeResult.rows[0].count}`);
    console.log(`💎 Total savings in database: ${savingsResult.rows[0].count}`);
    console.log(`🎯 Total savings goals in database: ${savingsGoalsResult.rows[0].count}`);
    console.log(`📊 Total budgets in database: ${budgetResult.rows[0].count}`);

    client.release();
    console.log('🎉 Database setup with authentication completed successfully!');
    
    console.log('\n📝 Next steps:');
    console.log('1. Make sure your .env.local file has the NextAuth secret');
    console.log('2. Run: npm run dev');
    console.log('3. Go to http://localhost:3000');
    console.log('4. Create your user account');
    console.log('5. Start tracking your expenses!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check database credentials in .env.local');
    console.log('3. Ensure database exists or user has CREATE privileges');
  } finally {
    await pool.end();
  }
}

// Run setup
setupWithAuth();
