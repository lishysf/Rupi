# Vercel Environment Variables Setup

## Required Environment Variables for Vercel Deployment

Copy and paste these environment variables into your Vercel project settings:

### 🔐 Supabase Configuration (Primary Database)
```
NEXT_PUBLIC_SUPABASE_URL=https://thkdrlozedfysuukvwmd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoa2RybG96ZWRmeXN1dWt2d21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MjA1MDU0ODgwMH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoa2RybG96ZWRmeXN1dWt2d21kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3MjgwMCwiZXhwIjoyMDUwNTQ4ODAwfQ.ServiceRoleKeyHere
SUPABASE_DB_PASSWORD=your-supabase-db-password-here
```

### 🔑 NextAuth Configuration
```
NEXTAUTH_URL=https://fundy.id
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key-here
```

### 🤖 AI Configuration (Groq)
```
GROQ_API_KEY=your-groq-api-key-here
```

### 🌍 Environment
```
NODE_ENV=production
```

## 📋 Setup Instructions

### 1. Supabase Setup
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** and **anon public** key
4. For the **service role key**, go to **Settings** → **API** → **Service Role** (keep this secret!)
5. For the database password, go to **Settings** → **Database** → **Connection string** and extract the password

### 2. NextAuth Secret
Generate a secure secret key:
```bash
openssl rand -base64 32
```

### 3. Groq API Key
1. Go to [Groq Console](https://console.groq.com/)
2. Create an account and generate an API key
3. Copy the API key

### 4. Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above with the corresponding value
4. Make sure to set the environment to **Production** for all variables
5. Redeploy your application

## 🔧 Database Migration

After setting up the environment variables, you'll need to initialize your Supabase database:

1. **Option 1: Use the Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**
   - Run the database initialization script

2. **Option 2: Use the API endpoint**
   - Create an API endpoint to initialize the database
   - Call it once after deployment

## 🚨 Security Notes

- **Never commit** `.env` files to version control
- **Service Role Key** should only be used server-side
- **Anon Key** is safe for client-side use
- **Database Password** should be kept secure
- Use **strong, unique secrets** for production

## 🔍 Verification

After deployment, verify your setup:

1. Check that your app loads without database errors
2. Test user registration/login
3. Verify that transactions can be created
4. Check that wallet balances are calculated correctly

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set correctly
3. Ensure Supabase database is properly initialized
4. Check that Row Level Security (RLS) policies are configured if needed
