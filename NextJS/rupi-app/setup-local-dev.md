# 🚀 Local Development Setup with Supabase PostgreSQL

## Step 1: Create Local Environment File

Create a `.env.local` file in your project root with these variables:

```bash
# Supabase PostgreSQL Configuration
SUPABASE_DB_HOST=thkdrlozedfysuukvwmd.supabase.co
SUPABASE_DB_PASSWORD=your-supabase-database-password-here

# NextAuth Configuration (Local Development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-nextauth-secret-here

# AI Configuration (Optional)
GROQ_API_KEY=your-groq-api-key-here

# Environment
NODE_ENV=development
```

## Step 2: Get Your Supabase Database Credentials

### From Supabase Dashboard:
1. Go to your Supabase project: https://supabase.com/dashboard/project/thkdrlozedfysuukvwmd
2. Navigate to **Settings** → **Database**
3. Copy the **Connection string** and extract the password
4. The host is: `thkdrlozedfysuukvwmd.supabase.co`
5. The database name is: `postgres`
6. The user is: `postgres`

## Step 3: Test Supabase Connection

Run the test script to verify your connection:

```bash
node test-supabase.js
```

## Step 4: Initialize Database

### Option A: Use Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-init.sql`
4. Click **"Run"**

### Option B: Use API Endpoint
1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/init-db`
3. This will automatically set up your database

## Step 5: Start Development Server

```bash
npm run dev
```

## Step 6: Test Your Application

1. Visit `http://localhost:3000`
2. Test user registration/login
3. Create a test transaction
4. Verify wallet functionality

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid API key" error**
   - Check that your Supabase credentials are correct
   - Verify the anon key is copied correctly

2. **"Database not found" error**
   - Make sure you've initialized the database
   - Check that the database password is correct

3. **"RLS policy" errors**
   - Ensure Row Level Security policies are set up
   - Check that the database initialization script ran successfully

### Debug Commands:

```bash
# Test Supabase connection
node test-supabase.js

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# Start with debug logging
DEBUG=* npm run dev
```

## 📊 Database Schema

Your Supabase database will have these tables:
- `users` - User accounts
- `user_wallets` - User wallets
- `transactions` - All financial transactions
- `savings_goals` - Savings goals
- `budgets` - Budget tracking

## 🎯 Next Steps

Once local development is working:
1. Test all features locally
2. Deploy to Vercel with production environment variables
3. Set up your custom domain `fundy.id`

Your local development environment is now ready! 🚀
