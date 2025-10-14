// Test Supabase PostgreSQL Connection Script
// Run this with: node test-supabase.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Test Supabase PostgreSQL connection
async function testSupabasePostgreSQL() {
  console.log('🔍 Testing Supabase PostgreSQL connection...');
  
  // You need to set these environment variables
  const supabaseHost = process.env.SUPABASE_DB_HOST || 'db.thkdrlozedfysuukvwmd.supabase.co';
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!supabasePassword) {
    console.log('❌ SUPABASE_DB_PASSWORD environment variable not set');
    console.log('💡 Create a .env.local file with your Supabase database password');
    return;
  }
  
  // URL encode the password to handle special characters
  const encodedPassword = encodeURIComponent(supabasePassword);
  const connectionString = `postgresql://postgres:${encodedPassword}@${supabaseHost}:5432/postgres`;
  console.log('🔗 Connection string:', connectionString.replace(encodedPassword, '***'));
  console.log('🔑 Password length:', supabasePassword.length);
  console.log('🔑 Password contains special chars:', /[#@$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(supabasePassword));
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔗 Connecting to:', supabaseHost);
    const client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    
    console.log('✅ Supabase PostgreSQL connection successful!');
    console.log('📊 Current time:', result.rows[0].current_time);
    console.log('📊 PostgreSQL version:', result.rows[0].postgres_version);
    
    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'transactions', 'user_wallets', 'savings_goals', 'budgets')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Database tables found:');
      tablesResult.rows.forEach(row => console.log('  -', row.table_name));
    } else {
      console.log('⚠️  Database tables not found. You may need to initialize the database.');
    }
    
    client.release();
    
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    console.log('💡 Check your Supabase database credentials');
  } finally {
    await pool.end();
  }
}

// Run the test
testSupabasePostgreSQL();
