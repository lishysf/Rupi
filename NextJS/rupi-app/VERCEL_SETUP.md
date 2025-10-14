# Vercel Deployment Setup Guide

## Quick Fix for Database Connection Issues

### Problem
Getting `ENOTFOUND db.thkdrlozedfysuukvwmd.supabase.co` error on Vercel.

### Solution: Use Supabase Connection Pooling

## Step-by-Step Instructions

### 1. Get Your Supabase Connection Pooling URL

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll down to find **Connection Pooling** section (NOT "Connection String")
4. Choose **Transaction Mode** (port 6543) or **Session Mode** (port 5432)
   - For Vercel, **Transaction Mode** is recommended
5. Copy the connection string that looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### 2. Configure Vercel Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

#### Required Variables:

```env
# Database Connection (use Supabase Pooling URL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres

# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-here

# Node Environment
NODE_ENV=production

# Groq API (for AI features)
GROQ_API_KEY=your-groq-api-key

# Public App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Important Notes:

- ✅ Use `DATABASE_URL` instead of separate `SUPABASE_DB_HOST` and `SUPABASE_DB_PASSWORD`
- ✅ Use port `6543` (transaction mode) for better serverless compatibility
- ✅ Make sure to replace `[project-ref]`, `[password]`, and `[region]` with your actual values
- ✅ **URL-encode special characters** in your password (e.g., `#` becomes `%23`)
- ✅ Apply these variables to **Production**, **Preview**, and **Development** environments
- ⚠️ **Do NOT add** `?pgbouncer=true` - SSL is configured automatically

### 3. Get Your Connection Details from Supabase

If you can't find the pooling URL in the dashboard:

1. **Project Reference**: Found in your Supabase project URL
   - Example: `thkdrlozedfysuukvwmd` from `db.thkdrlozedfysuukvwmd.supabase.co`

2. **Password**: The database password you created when setting up Supabase

3. **Region**: Usually shown in the connection pooling section
   - Examples: `us-east-1`, `ap-southeast-1`, `eu-west-1`

4. **Full Connection String Example**:
   ```
   postgresql://postgres.thkdrlozedfysuukvwmd:Khalis%23150603@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   
   Note: Special characters in passwords must be URL-encoded:
   - `#` → `%23`
   - `@` → `%40`
   - `$` → `%24`
   - etc.

### 4. Deploy Your Changes

After setting the environment variables:

1. Push your updated code to GitHub:
   ```bash
   git add .
   git commit -m "Fix: Update database connection for Vercel serverless"
   git push
   ```

2. Vercel will automatically redeploy

### 5. Verify the Connection

Check your Vercel deployment logs:
- You should see successful database connections
- No more `ENOTFOUND` errors

## Why This Fix Works

1. **Connection Pooling**: Serverless platforms like Vercel can't maintain persistent database connections. Supabase's connection pooling (via pgBouncer) manages this.

2. **Optimized Settings**: The updated code uses:
   - `max: 1` - Single connection per serverless function
   - `idleTimeoutMillis: 10000` - Close connections quickly
   - `connectionTimeoutMillis: 10000` - Fail fast if connection issues

3. **Proper SSL**: Uses SSL in production for secure connections

## Troubleshooting

### Still getting connection errors?

1. **Check environment variable names**: Make sure you're using `DATABASE_URL` (not `POSTGRES_URL` or other variants)

2. **Verify the connection string format**:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   ```
   
   Make sure:
   - Password has special characters URL-encoded
   - Using port `6543` for transaction mode
   - No extra query parameters needed (SSL is auto-configured)

3. **Test the connection**: Use Supabase's SQL Editor to verify your database is accessible

4. **Check Vercel logs**: Look for specific error messages in Function logs

5. **Verify environment scope**: Make sure variables are set for the correct environment (Production/Preview/Development)

### Local development still works?

Yes! The code now supports three modes:
- `DATABASE_URL` - For production (Vercel)
- `SUPABASE_DB_*` - Legacy support
- `DB_*` - Local development

Your local `.env.local` can still use the individual variables.

## Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)

