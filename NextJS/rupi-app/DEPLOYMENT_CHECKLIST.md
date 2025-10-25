# 🚀 Telegram Bot Deployment Checklist

Follow this checklist to deploy your Telegram bot to production.

## ✅ Pre-Deployment

- [ ] Code committed to Git repository
- [ ] Vercel project connected to repository
- [ ] Database (Supabase/PostgreSQL) is accessible
- [ ] Telegram bot created via @BotFather
- [ ] Bot token saved securely

## 📦 Deployment Steps

### Step 1: Configure Vercel Environment Variables

Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables

Add the following variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `TELEGRAM_BOT_TOKEN` | `7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E` | Your bot token from BotFather |
| `DATABASE_URL` | `postgresql://...` | Your database connection string |
| `NEXTAUTH_SECRET` | `your-secret` | NextAuth secret key |
| `NEXTAUTH_URL` | `https://fundy.id` | Your production domain |
| `GROQ_API_KEY` | `your-groq-key` | Groq AI API key |

**Important:** Select **Production**, **Preview**, and **Development** for each variable.

- [ ] All environment variables added
- [ ] Variables applied to all environments

### Step 2: Deploy to Vercel

```bash
git add .
git commit -m "Add Telegram bot integration"
git push origin main
```

Or use Vercel CLI:
```bash
vercel --prod
```

- [ ] Code deployed to Vercel
- [ ] Deployment successful (check Vercel dashboard)
- [ ] No build errors

### Step 3: Initialize Database Tables

Run the setup script:

```bash
npm run setup-telegram
```

Or manually:

```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "init_database"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Database tables initialized"
}
```

- [ ] Database tables created
- [ ] No errors in response

### Step 4: Configure Webhook

The setup script handles this automatically, or run manually:

```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_webhook",
    "webhookUrl": "https://fundy.id/api/telegram/webhook"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Webhook set successfully",
  "webhookUrl": "https://fundy.id/api/telegram/webhook"
}
```

- [ ] Webhook configured
- [ ] Webhook URL correct

### Step 5: Verify Setup

Check webhook status:

```bash
curl https://fundy.id/api/telegram/setup
```

Expected response should include:
```json
{
  "success": true,
  "webhookInfo": {
    "url": "https://fundy.id/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

- [ ] Webhook status returns success
- [ ] Webhook URL matches your domain
- [ ] No pending errors

## 🧪 Testing

### Test 1: Basic Commands

Open Telegram and message @FundyIDbot:

1. Send: `/start`
   - [ ] Receives welcome message
   
2. Send: `/help`
   - [ ] Receives help message with commands

### Test 2: Authentication

1. Send: `/login`
   - [ ] Bot asks for email
   
2. Enter your Fundy email
   - [ ] Bot asks for password
   
3. Enter your password
   - [ ] Bot confirms login success
   - [ ] Shows welcome message

4. Send: `/status`
   - [ ] Shows logged-in status with email

### Test 3: AI Chat

1. Send: "Beli kopi 30k pakai Gopay"
   - [ ] Bot responds with transaction confirmation
   - [ ] Transaction recorded in database
   
2. Send: "Berapa total pengeluaran hari ini?"
   - [ ] Bot provides analysis
   - [ ] Includes correct financial data

3. Send: "/logout"
   - [ ] Bot confirms logout
   - [ ] Cannot send transactions anymore

## 🔍 Monitoring

### Check Vercel Logs

Go to: https://vercel.com/[your-team]/[your-project]/logs

Look for:
- [ ] Telegram webhook requests (POST /api/telegram/webhook)
- [ ] No 500 errors
- [ ] Successful authentication logs
- [ ] AI response generation logs

### Check Database

Connect to your database and verify:

```sql
-- Check if table exists
SELECT * FROM telegram_sessions;

-- Should see sessions after users login
SELECT telegram_user_id, is_authenticated, last_activity 
FROM telegram_sessions 
ORDER BY last_activity DESC;
```

- [ ] `telegram_sessions` table exists
- [ ] Sessions recorded after user logins

## 🎨 Optional: Customize Bot

### Add Bot Description

1. Open Telegram and message @BotFather
2. Send `/mybots`
3. Select your bot
4. Choose "Edit Description"
5. Enter:
```
Fundy AI Assistant - Your personal finance manager powered by AI. 
Manage expenses, track income, and get insights on your spending.
```

### Add Bot About Text

Choose "Edit About" and enter:
```
AI-powered financial assistant for Fundy
```

### Add Bot Profile Picture

1. Choose "Edit Bot Picture"
2. Upload your Fundy logo/icon

### Add Commands List

1. Choose "Edit Commands"
2. Enter:
```
start - Start the bot
login - Login with Fundy account
logout - Logout from account
status - Check login status
help - Show available commands
```

- [ ] Bot description added
- [ ] Bot about text added
- [ ] Profile picture uploaded
- [ ] Commands list configured

## 🚨 Troubleshooting

### Bot Not Responding

**Problem:** Bot doesn't reply to messages

**Solutions:**
1. Check Vercel logs for errors
2. Verify webhook is set:
   ```bash
   curl https://fundy.id/api/telegram/setup
   ```
3. Check TELEGRAM_BOT_TOKEN is correct
4. Re-set webhook:
   ```bash
   npm run setup-telegram
   ```

### Authentication Failing

**Problem:** Can't login with email/password

**Solutions:**
1. Verify credentials work on web (https://fundy.id)
2. Check database connection
3. Review Vercel logs for authentication errors
4. Try `/logout` then `/login` again

### Database Errors

**Problem:** "Table doesn't exist" errors

**Solutions:**
1. Run database initialization:
   ```bash
   curl -X POST https://fundy.id/api/telegram/setup \
     -H "Content-Type: application/json" \
     -d '{"action": "init_database"}'
   ```
2. Check DATABASE_URL is correct
3. Verify database is accessible from Vercel

### AI Not Responding

**Problem:** Bot replies but AI doesn't work

**Solutions:**
1. Check GROQ_API_KEY is set
2. Verify Groq API quota
3. Check Vercel logs for Groq errors

## 📊 Success Metrics

After deployment, monitor:

- [ ] **Response Rate:** Bot responds to all messages
- [ ] **Authentication Rate:** Users can login successfully
- [ ] **Transaction Success:** Transactions are recorded correctly
- [ ] **AI Quality:** AI responses are relevant and accurate
- [ ] **Error Rate:** Minimal errors in logs

## 🎉 Launch

Once all checks pass:

- [ ] Announce to users
- [ ] Share bot link: https://t.me/FundyIDbot
- [ ] Monitor for first 24 hours
- [ ] Gather user feedback
- [ ] Iterate and improve

## 📚 Documentation Links

- [Quick Start Guide](./TELEGRAM_QUICK_START.md)
- [Detailed Setup Guide](./TELEGRAM_BOT_SETUP.md)
- [Telegram Bot API Docs](https://core.telegram.org/bots/api)

---

**Congratulations! 🎊**

Your Telegram bot is now live and ready to help users manage their finances!

For support or issues, check Vercel logs and the troubleshooting section above.

