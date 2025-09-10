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

async function setupDatabase() {
  try {
    console.log('🔧 Setting up Rupi database...');
    
    // Test connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Create expenses table
    console.log('📋 Creating expenses table...');
    await client.query(`
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
    console.log('💰 Creating income table...');
    await client.query(`
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

    // Drop and recreate savings tables to ensure correct structure
    console.log('💎 Dropping existing savings tables...');
    await client.query('DROP TABLE IF EXISTS savings CASCADE');
    await client.query('DROP TABLE IF EXISTS savings_goals CASCADE');
    
    // Create savings table
    console.log('💎 Creating savings table...');
    await client.query(`
      CREATE TABLE savings (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        goal_name VARCHAR(200),
        goal_id INTEGER,
        type VARCHAR(50) NOT NULL DEFAULT 'deposit',
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create savings goals table
    console.log('🎯 Creating savings goals table...');
    await client.query(`
      CREATE TABLE savings_goals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        target_amount DECIMAL(10, 2) NOT NULL,
        current_amount DECIMAL(10, 2) DEFAULT 0,
        deadline DATE,
        icon VARCHAR(50),
        color VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Drop and recreate budgets table to ensure correct structure
    console.log('🎯 Dropping existing budgets table...');
    await client.query('DROP TABLE IF EXISTS budgets CASCADE');
    
    console.log('🎯 Creating budgets table with correct structure...');
    await client.query(`
      CREATE TABLE budgets (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, month, year)
      )
    `);

    // Create indexes
    console.log('🗂️ Creating database indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_goal_id ON savings(goal_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON savings_goals(deadline);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
    `);

    // Clear any existing data (start fresh)
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM income');
    await client.query('DELETE FROM savings');
    await client.query('DELETE FROM savings_goals');
    await client.query('DELETE FROM budgets');
    
    console.log('✅ Database cleared, starting fresh!');

    // Test budgets table structure
    console.log('🧪 Testing budgets table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Budgets table columns:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test inserting a sample budget
    console.log('🧪 Testing budget insertion...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const testBudget = {
      category: 'Food & Groceries',
      amount: 2000000,
      month: currentMonth,
      year: currentYear
    };
    
    const insertQuery = `
      INSERT INTO budgets (category, amount, month, year)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const testResult = await client.query(insertQuery, [
      testBudget.category,
      testBudget.amount,
      testBudget.month,
      testBudget.year
    ]);
    
    console.log('✅ Test budget inserted successfully:', testResult.rows[0]);
    
    // Clean up test data
    await client.query('DELETE FROM budgets WHERE category = $1', [testBudget.category]);
    console.log('🧹 Test budget cleaned up');

    // Display table info
    const [expenseResult, incomeResult, savingsResult, savingsGoalsResult, budgetResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM expenses'),
      client.query('SELECT COUNT(*) as count FROM income'),
      client.query('SELECT COUNT(*) as count FROM savings'),
      client.query('SELECT COUNT(*) as count FROM savings_goals'),
      client.query('SELECT COUNT(*) as count FROM budgets')
    ]);
    console.log(`📈 Total expenses in database: ${expenseResult.rows[0].count}`);
    console.log(`💰 Total income in database: ${incomeResult.rows[0].count}`);
    console.log(`💎 Total savings in database: ${savingsResult.rows[0].count}`);
    console.log(`🎯 Total savings goals in database: ${savingsGoalsResult.rows[0].count}`);
    console.log(`🎯 Total budgets in database: ${budgetResult.rows[0].count}`);

    client.release();
    console.log('🎉 Database setup completed successfully!');
    
    console.log('\n📝 Next steps:');
    console.log('1. Set up your .env.local file with database credentials');
    console.log('2. Add your Groq API key to .env.local');
    console.log('3. Run: npm run dev');
    console.log('4. Test the AI chat with these examples:');
    console.log('   - Expenses: "Aku beli kopi 50.000", "Bayar listrik 200rb", "Bayar cicilan motor 1.5 juta"');
    console.log('   - Savings: "Tabung deposito 2 juta", "Invest saham 500rb"');
    console.log('   - Income: "Gajian bulan ini 8 juta", "Dapat bonus 2 juta"');
    console.log('5. Test budget functionality by creating budgets in the app');

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
setupDatabase();
