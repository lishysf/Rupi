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

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Create users table
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

    // Create default user for existing data
    console.log('👤 Creating default user for existing data...');
    const defaultUser = await client.query(`
      INSERT INTO users (email, password_hash, name) 
      VALUES ('default@example.com', '$2a$12$default.hash.for.existing.data', 'Default User')
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `);
    
    const defaultUserId = defaultUser.rows.length > 0 ? defaultUser.rows[0].id : null;

    // Migrate expenses table
    console.log('💸 Migrating expenses table...');
    const expensesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    if (expensesTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'expenses' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE expenses SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM expenses WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;`);
        }
        console.log('✅ Expenses table migrated');
      } else {
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM expenses WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE expenses SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in expenses table');
          }
        }
        console.log('✅ Expenses table already migrated');
      }
    }

    // Migrate income table
    console.log('💰 Migrating income table...');
    const incomeTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'income'
      );
    `);
    
    if (incomeTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'income' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE income ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE income SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM income WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE income ALTER COLUMN user_id SET NOT NULL;`);
        }
        console.log('✅ Income table migrated');
      } else {
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM income WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE income SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE income ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in income table');
          }
        }
        console.log('✅ Income table already migrated');
      }
    }

    // Migrate investments table
    console.log('📈 Migrating investments table...');
    const investmentsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investments'
      );
    `);
    
    if (investmentsTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'investments' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE investments ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE investments SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM investments WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE investments ALTER COLUMN user_id SET NOT NULL;`);
        }
        console.log('✅ Investments table migrated');
      } else {
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM investments WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE investments SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE investments ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in investments table');
          }
        }
        console.log('✅ Investments table already migrated');
      }
    }

    // Migrate savings table
    console.log('💎 Migrating savings table...');
    const savingsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'savings'
      );
    `);
    
    if (savingsTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'savings' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE savings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE savings SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        // Check if there are still NULL values before making NOT NULL
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM savings WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE savings ALTER COLUMN user_id SET NOT NULL;`);
        } else {
          console.log('⚠️ Warning: Some savings records have NULL user_id values');
        }
        console.log('✅ Savings table migrated');
      } else {
        // Check if there are NULL values in existing user_id column
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM savings WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE savings SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE savings ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in savings table');
          }
        }
        console.log('✅ Savings table already migrated');
      }
    }

    // Migrate savings_goals table
    console.log('🎯 Migrating savings_goals table...');
    const savingsGoalsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'savings_goals'
      );
    `);
    
    if (savingsGoalsTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'savings_goals' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE savings_goals ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE savings_goals SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM savings_goals WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE savings_goals ALTER COLUMN user_id SET NOT NULL;`);
        }
        console.log('✅ Savings goals table migrated');
      } else {
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM savings_goals WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE savings_goals SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE savings_goals ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in savings_goals table');
          }
        }
        console.log('✅ Savings goals table already migrated');
      }
    }

    // Migrate budgets table
    console.log('📊 Migrating budgets table...');
    const budgetsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets'
      );
    `);
    
    if (budgetsTableExists.rows[0].exists) {
      const userColumnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'budgets' 
          AND column_name = 'user_id'
        );
      `);
      
      if (!userColumnExists.rows[0].exists) {
        await client.query(`ALTER TABLE budgets ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
        if (defaultUserId) {
          await client.query(`UPDATE budgets SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
        }
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM budgets WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) === 0) {
          await client.query(`ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;`);
        }
        
        // Update unique constraint
        await client.query(`ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_month_year_key;`);
        await client.query(`ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_month_year_key UNIQUE(user_id, category, month, year);`);
        console.log('✅ Budgets table migrated');
      } else {
        const nullCheck = await client.query(`SELECT COUNT(*) as count FROM budgets WHERE user_id IS NULL;`);
        if (parseInt(nullCheck.rows[0].count) > 0) {
          if (defaultUserId) {
            await client.query(`UPDATE budgets SET user_id = $1 WHERE user_id IS NULL;`, [defaultUserId]);
            await client.query(`ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;`);
            console.log('✅ Fixed NULL user_id values in budgets table');
          }
        }
        console.log('✅ Budgets table already migrated');
      }
    }

    // Create indexes only for tables that exist
    console.log('🗂️ Creating indexes...');
    
    // Check which tables exist and create indexes accordingly
    const tableChecks = await Promise.all([
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses');`),
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'income');`),
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments');`),
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'savings');`),
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'savings_goals');`),
      client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets');`)
    ]);
    
    const [expensesExists, incomeExists, investmentsExists, savingsExists, savingsGoalsExists, budgetsExists] = tableChecks.map(result => result.rows[0].exists);
    
    if (expensesExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);`);
    }
    
    if (incomeExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_income_source ON income(source);`);
    }
    
    if (investmentsExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);`);
    }
    
    if (savingsExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(date);`);
    }
    
    if (savingsGoalsExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);`);
    }
    
    if (budgetsExists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);`);
    }

    client.release();
    console.log('🎉 Database migration completed successfully!');
    
    console.log('\n📝 Next steps:');
    console.log('1. Create your .env.local file with the NextAuth secret');
    console.log('2. Run: npm run dev');
    console.log('3. Create your user account');

  } catch (error) {
    console.error('❌ Database migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateDatabase();
