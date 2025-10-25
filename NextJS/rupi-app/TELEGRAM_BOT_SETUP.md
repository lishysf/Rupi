# Telegram Bot Setup Guide

This guide will help you set up the Fundy Telegram Bot integration.

## Prerequisites

1. Your Telegram bot token: `7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E`
2. Your deployed Vercel URL: `https://fundy.id`
3. Access to your Vercel environment variables

## Step 1: Configure Environment Variables

Add the following environment variable to your Vercel project:

```bash
TELEGRAM_BOT_TOKEN=7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E
```

### How to add environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add the variable name: `TELEGRAM_BOT_TOKEN`
5. Add the value: `7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E`
6. Select all environments (Production, Preview, Development)
7. Click "Save"
8. Redeploy your application for changes to take effect

## Step 2: Initialize Database Tables

After deployment, initialize the Telegram session tables:

### Option A: Using the API endpoint

```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "init_database"}'
```

### Option B: Using the setup script

```bash
npm run setup-telegram
```

## Step 3: Set Up Webhook

Configure the Telegram webhook to point to your Vercel endpoint:

### Option A: Using the API endpoint

```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_webhook",
    "webhookUrl": "https://fundy.id/api/telegram/webhook"
  }'
```

### Option B: Using the setup script

```bash
npm run setup-telegram-webhook
```

### Option C: Using the provided script

```bash
node scripts/setup-telegram-webhook.js
```

## Step 4: Verify Webhook

Check if the webhook is properly configured:

```bash
curl https://fundy.id/api/telegram/setup
```

Or visit: https://fundy.id/api/telegram/webhook

## Step 5: Test Your Bot

1. Open Telegram and search for your bot: [@FundyIDbot](https://t.me/FundyIDbot)
2. Send `/start` to the bot
3. Use `/login` to authenticate with your Fundy account
4. Start chatting with the AI!

## Available Commands

- `/start` - Start the bot and see welcome message
- `/login` - Login with your Fundy email and password
- `/logout` - Logout from your account
- `/status` - Check your current login status
- `/help` - Show available commands

## Usage Examples

Once logged in, you can chat naturally with the bot:

### Recording Transactions
- "Beli kopi 30k pakai Gopay"
- "Gaji 5 juta ke BCA"
- "Bayar listrik 200rb dari Mandiri"

### Financial Analysis
- "Analisis pengeluaran bulan ini"
- "Berapa total pengeluaran hari ini?"
- "Breakdown spending by category"

### General Questions
- "Berapa saldo total saya?"
- "What's my biggest expense this month?"

## Troubleshooting

### Webhook not receiving updates

1. Check if webhook is set correctly:
```bash
curl https://fundy.id/api/telegram/setup
```

2. Delete and re-set webhook:
```bash
# Delete webhook
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_webhook"}'

# Set webhook again
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_webhook",
    "webhookUrl": "https://fundy.id/api/telegram/webhook"
  }'
```

### Bot not responding

1. Check Vercel logs for errors
2. Verify environment variable is set correctly
3. Make sure database tables are initialized
4. Check if user is logged in with `/status`

### Authentication issues

1. Make sure you're using the correct email and password from your Fundy web account
2. If login fails, try `/logout` and `/login` again
3. Check Vercel logs for authentication errors

## Security Notes

- Never share your bot token publicly
- User passwords are securely hashed and never stored in plain text
- Sessions are stored securely in the database
- All communication happens over HTTPS

## Architecture

```
Telegram User
    ↓
Telegram Bot API
    ↓
Vercel Webhook (https://fundy.id/api/telegram/webhook)
    ↓
Authentication Check (telegram_sessions table)
    ↓
AI Chat Service (same as web)
    ↓
Database (transactions, wallets, etc.)
    ↓
Response to User
```

## API Endpoints

### POST /api/telegram/webhook
Receives incoming Telegram messages and processes them.

### GET /api/telegram/webhook
Returns webhook information and status.

### POST /api/telegram/setup
Setup endpoint for webhook configuration.
- Actions: `set_webhook`, `delete_webhook`, `get_webhook_info`, `init_database`

### GET /api/telegram/setup
Returns current webhook status and information.

## Database Schema

### telegram_sessions table
```sql
CREATE TABLE telegram_sessions (
  id SERIAL PRIMARY KEY,
  telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
  fundy_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  is_authenticated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review database logs
3. Test webhook status via API
4. Verify environment variables

## Next Steps

After setup is complete:
1. Share the bot link with your users: https://t.me/FundyIDbot
2. Add bot description and profile picture via [@BotFather](https://t.me/BotFather)
3. Monitor bot usage via Vercel analytics
4. Consider adding rate limiting for production use
