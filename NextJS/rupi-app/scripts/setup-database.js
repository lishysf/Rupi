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

    // Create indexes
    console.log('🗂️ Creating database indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);

    // Clear any existing data (start fresh)
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM income');
    
    console.log('✅ Database cleared, starting fresh!');

    // Display table info
    const [expenseResult, incomeResult] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM expenses'),
      client.query('SELECT COUNT(*) as count FROM income')
    ]);
    console.log(`📈 Total expenses in database: ${expenseResult.rows[0].count}`);
    console.log(`💰 Total income in database: ${incomeResult.rows[0].count}`);

    client.release();
    console.log('🎉 Database setup completed successfully!');
    
    console.log('\n📝 Next steps:');
    console.log('1. Set up your .env.local file with database credentials');
    console.log('2. Add your Groq API key to .env.local');
    console.log('3. Run: npm run dev');
    console.log('4. Test the AI chat by saying: "Aku beli kopi 50.000" or "Gajian bulan ini 8 juta"');

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
