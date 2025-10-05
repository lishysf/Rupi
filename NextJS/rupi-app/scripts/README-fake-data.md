# Fake Data Injection Script

This script generates realistic fake financial data for the entire month of October 2024 using Indonesian Rupiah (IDR) currency.

## What it does

- **Generates expenses**: 2-5 random expenses per day throughout October
- **Generates income**: 1-3 income entries per week
- **Uses realistic amounts**: Ranges from small daily expenses (10k-50k) to large purchases (500k-2M)
- **Realistic descriptions**: Context-appropriate descriptions for each category
- **Clears existing data**: Removes any existing October 2024 data first

## Data Categories

### Expenses
- Food & Groceries
- Transportation
- Housing & Utilities
- Health & Personal
- Entertainment & Shopping
- Debt Payments
- Savings & Investments
- Family & Others
- Education
- Insurance
- Travel
- Subscriptions
- Gifts & Donations
- Miscellaneous

### Income Sources
- Salary (5M-15M range)
- Freelance (100k-1M range)
- Business revenue
- Investment returns
- Rental income
- Side hustle
- Bonus payments
- Other income

## How to run

```bash
# Using npm script (recommended)
npm run inject-fake-data

# Or directly with node
node scripts/inject-fake-october-data.js
```

## Prerequisites

1. **Database must be set up** and running
2. **User must exist** in the database (script will use the first user found)
3. **Environment variables** must be configured for database connection

## What happens after running

1. Clears any existing October 2024 data
2. Generates ~100-150 expense transactions
3. Generates ~10-15 income transactions
4. Shows a summary of total income, expenses, and net savings
5. Data is immediately available in the analytics dashboard

## Sample Output

```
🚀 Starting fake data injection for October 2024...
📊 Using user ID: 1
🧹 Clearing existing October 2024 data...
✅ Existing October data cleared
💰 Generating expenses...
✅ Generated 124 expenses
💵 Generating income...
✅ Generated 12 income entries

📈 October 2024 Data Summary:
💰 Total Income: Rp 45,000,000
💸 Total Expenses: Rp 28,500,000
💎 Net Savings: Rp 16,500,000
📊 Total Transactions: 136

🎉 Fake data injection completed successfully!
🔍 You can now view the analytics page to see the October data.
```

## Notes

- All amounts are in Indonesian Rupiah (IDR)
- Dates are randomly distributed throughout October 2024
- Descriptions are contextually appropriate for each category
- The script is safe to run multiple times (clears existing data first)
- Generated data is realistic and suitable for testing analytics features
