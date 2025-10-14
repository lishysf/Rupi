# 🚀 Fundy.id Deployment Guide

## 📋 Complete Environment Variables for Vercel

Copy these exact environment variables into your Vercel project settings:

### 🔐 Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://thkdrlozedfysuukvwmd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoa2RybG96ZWRmeXN1dWt2d21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MjA1MDU0ODgwMH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
SUPABASE_DB_PASSWORD=your-database-password-from-supabase
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

## 🎯 Step-by-Step Deployment Process

### 1. **Vercel Project Setup**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Set **Root Directory** to `Rupi/NextJS/rupi-app`
5. Click **"Deploy"**

### 2. **Domain Configuration**
1. In your Vercel project settings, go to **"Domains"**
2. Add your custom domain: `fundy.id`
3. Configure DNS settings as instructed by Vercel
4. Wait for domain verification (usually 5-10 minutes)

### 3. **Environment Variables Setup**
1. In your Vercel project, go to **"Settings"** → **"Environment Variables"**
2. Add each variable from the list above
3. Set environment to **"Production"** for all variables
4. Click **"Save"**

### 4. **Database Initialization**
After deployment, initialize your Supabase database:

**Option A: Use Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **"SQL Editor"**
3. Copy and paste the contents of `supabase-init.sql`
4. Click **"Run"**

**Option B: Use API Endpoint**
1. Visit: `https://fundy.id/api/init-db`
2. This will automatically set up your database

### 5. **Verify Deployment**
1. Visit `https://fundy.id`
2. Test user registration/login
3. Create a test transaction
4. Verify wallet functionality

## 🔧 Additional Configuration

### **Next.js Configuration**
Your `next.config.ts` should include:
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg']
  }
}

module.exports = nextConfig
```

### **Domain-Specific Settings**
- **Production URL**: `https://fundy.id`
- **Development URL**: `http://localhost:3000`
- **API Base URL**: `https://fundy.id/api`

## 🚨 Important Security Notes

1. **Never commit** environment variables to your repository
2. **Service Role Key** should only be used server-side
3. **Anon Key** is safe for client-side use
4. **Database Password** should be kept secure
5. Use **strong, unique secrets** for production

## 🔍 Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Verify Supabase credentials are correct
   - Check that database is initialized
   - Ensure RLS policies are set up

2. **Authentication Issues**
   - Verify `NEXTAUTH_URL` is set to `https://fundy.id`
   - Check that `NEXTAUTH_SECRET` is set
   - Ensure domain is properly configured

3. **API Errors**
   - Check Vercel function logs
   - Verify all environment variables are set
   - Test API endpoints individually

## 📞 Support

If you encounter issues:
1. Check Vercel function logs in your dashboard
2. Verify all environment variables are set correctly
3. Ensure Supabase database is properly initialized
4. Test the database initialization endpoint: `https://fundy.id/api/init-db`

## 🎉 Success Checklist

- [ ] Vercel project deployed successfully
- [ ] Custom domain `fundy.id` configured
- [ ] All environment variables set
- [ ] Database initialized
- [ ] User registration/login working
- [ ] Transactions can be created
- [ ] Wallet balances calculated correctly
- [ ] AI features working (if Groq API key is set)

Your Fundy.id application is now ready for production! 🚀
