const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Rupi_Local',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'khalis',
});

// Expense categories
const EXPENSE_CATEGORIES = [
  'Food & Groceries',
  'Transportation', 
  'Housing & Utilities',
  'Health & Personal',
  'Entertainment & Shopping',
  'Debt Payments',
  'Savings & Investments',
  'Family & Others',
  'Education',
  'Insurance',
  'Travel',
  'Subscriptions',
  'Gifts & Donations',
  'Miscellaneous'
];

// Income sources
const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment Returns',
  'Rental Income',
  'Side Hustle',
  'Bonus',
  'Other'
];

// Generate random amount in Rupiah (realistic ranges)
function generateExpenseAmount() {
  const ranges = [
    { min: 10000, max: 50000 },    // Small expenses (10k-50k)
    { min: 50000, max: 150000 },   // Medium expenses (50k-150k)
    { min: 150000, max: 500000 },  // Large expenses (150k-500k)
    { min: 500000, max: 2000000 }  // Very large expenses (500k-2M)
  ];
  
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function generateIncomeAmount() {
  const ranges = [
    { min: 5000000, max: 15000000 },   // Salary range (5M-15M)
    { min: 100000, max: 1000000 },     // Side income (100k-1M)
    { min: 50000, max: 500000 }        // Small income (50k-500k)
  ];
  
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

// Generate random date in October 2024
function generateOctoberDate() {
  const year = 2024;
  const month = 9; // October (0-indexed)
  const day = Math.floor(Math.random() * 31) + 1; // 1-31
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  
  return new Date(year, month, day, hour, minute);
}

// Generate realistic expense descriptions
function generateExpenseDescription(category) {
  const descriptions = {
    'Food & Groceries': [
    'Grocery shopping at supermarket',
    'Lunch at restaurant',
    'Coffee break',
    'Dinner with friends',
    'Snacks and beverages',
    'Weekly grocery run',
    'Takeaway food',
    'Cooking ingredients'
  ],
    'Transportation': [
    'Fuel for car',
    'Public transport ticket',
    'Taxi ride',
    'Parking fee',
    'Car maintenance',
    'Bus fare',
    'Motorcycle fuel',
    'Toll road fee'
  ],
    'Housing & Utilities': [
    'Electricity bill',
    'Water bill',
    'Internet subscription',
    'Rent payment',
    'Property tax',
    'Home maintenance',
    'Gas bill',
    'Security service'
  ],
    'Health & Personal': [
    'Doctor visit',
    'Medicine purchase',
    'Gym membership',
    'Personal care items',
    'Health checkup',
    'Dental treatment',
    'Vitamins and supplements',
    'Beauty products'
  ],
    'Entertainment & Shopping': [
    'Movie tickets',
    'Shopping at mall',
    'Online shopping',
    'Entertainment venue',
    'Clothing purchase',
    'Electronics',
    'Books and magazines',
    'Gaming subscription'
  ]
  };
  
  const categoryDescriptions = descriptions[category] || ['Miscellaneous expense'];
  return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
}

// Generate realistic income descriptions
function generateIncomeDescription(source) {
  const descriptions = {
    'Salary': [
      'Monthly salary payment',
      'Salary from company',
      'Regular salary deposit',
      'Monthly income'
    ],
    'Freelance': [
      'Freelance project payment',
      'Consulting fee',
      'Freelance work completed',
      'Project milestone payment'
    ],
    'Business': [
      'Business revenue',
      'Sales income',
      'Business profit',
      'Customer payment'
    ],
    'Investment Returns': [
      'Stock dividend',
      'Investment profit',
      'Mutual fund returns',
      'Bond interest'
    ],
    'Rental Income': [
      'Property rental income',
      'Room rental payment',
      'Property lease income'
    ],
    'Side Hustle': [
      'Side project income',
      'Part-time work payment',
      'Extra income',
      'Side business revenue'
    ],
    'Bonus': [
      'Performance bonus',
      'Year-end bonus',
      'Achievement bonus',
      'Company bonus'
    ],
    'Other': [
      'Miscellaneous income',
      'Other revenue',
      'Additional income'
    ]
  };
  
  const sourceDescriptions = descriptions[source] || ['Income payment'];
  return sourceDescriptions[Math.floor(Math.random() * sourceDescriptions.length)];
}

async function injectFakeData() {
  try {
    console.log('🚀 Starting fake data injection for October 2024...');
    
    // Get a user ID (assuming user exists)
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('❌ No users found in database. Please create a user first.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`📊 Using user ID: ${userId}`);
    
    // Clear existing October 2024 data
    console.log('🧹 Clearing existing October 2024 data...');
    await pool.query(`
      DELETE FROM expenses 
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = 2024 AND EXTRACT(MONTH FROM date) = 10
    `, [userId]);
    
    await pool.query(`
      DELETE FROM income 
      WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = 2024 AND EXTRACT(MONTH FROM date) = 10
    `, [userId]);
    
    console.log('✅ Existing October data cleared');
    
    // Generate expenses (2-5 per day)
    console.log('💰 Generating expenses...');
    const expenses = [];
    for (let day = 1; day <= 31; day++) {
      const expenseCount = Math.floor(Math.random() * 4) + 2; // 2-5 expenses per day
      
      for (let i = 0; i < expenseCount; i++) {
        const category = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
        const amount = generateExpenseAmount();
        const description = generateExpenseDescription(category);
        const date = new Date(2024, 9, day, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        expenses.push({
          user_id: userId,
          description,
          amount,
          category,
          date
        });
      }
    }
    
    // Insert expenses
    for (const expense of expenses) {
      await pool.query(`
        INSERT INTO expenses (user_id, description, amount, category, date)
        VALUES ($1, $2, $3, $4, $5)
      `, [expense.user_id, expense.description, expense.amount, expense.category, expense.date]);
    }
    
    console.log(`✅ Generated ${expenses.length} expenses`);
    
    // Generate income (1-3 per week)
    console.log('💵 Generating income...');
    const income = [];
    const weeks = [1, 8, 15, 22, 29]; // Start of each week in October
    
    for (const weekStart of weeks) {
      const incomeCount = Math.floor(Math.random() * 3) + 1; // 1-3 income entries per week
      
      for (let i = 0; i < incomeCount; i++) {
        const source = INCOME_SOURCES[Math.floor(Math.random() * INCOME_SOURCES.length)];
        const amount = generateIncomeAmount();
        const description = generateIncomeDescription(source);
        const day = weekStart + Math.floor(Math.random() * 7);
        const date = new Date(2024, 9, Math.min(day, 31), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        income.push({
          user_id: userId,
          description,
          amount,
          source,
          date
        });
      }
    }
    
    // Insert income
    for (const incomeEntry of income) {
      await pool.query(`
        INSERT INTO income (user_id, description, amount, source, date)
        VALUES ($1, $2, $3, $4, $5)
      `, [incomeEntry.user_id, incomeEntry.description, incomeEntry.amount, incomeEntry.source, incomeEntry.date]);
    }
    
    console.log(`✅ Generated ${income.length} income entries`);
    
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    
    console.log('\n📈 October 2024 Data Summary:');
    console.log(`💰 Total Income: Rp ${totalIncome.toLocaleString('id-ID')}`);
    console.log(`💸 Total Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}`);
    console.log(`💎 Net Savings: Rp ${netSavings.toLocaleString('id-ID')}`);
    console.log(`📊 Total Transactions: ${expenses.length + income.length}`);
    
    console.log('\n🎉 Fake data injection completed successfully!');
    console.log('🔍 You can now view the analytics page to see the October data.');
    
  } catch (error) {
    console.error('❌ Error injecting fake data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
injectFakeData();
