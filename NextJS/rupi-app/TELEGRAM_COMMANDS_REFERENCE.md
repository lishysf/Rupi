# 🎯 Telegram Bot - Quick Command Reference

## 🚀 Setup Commands (One-Time)

### Add to Vercel Environment Variables
```
TELEGRAM_BOT_TOKEN=7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E
```

### Initialize & Configure
```bash
npm run setup-telegram
```

---

## 💬 User Commands (In Telegram)

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Start the bot | `/start` |
| `/login` | Login with Fundy account | `/login` → enter email → enter password |
| `/logout` | Logout from account | `/logout` |
| `/status` | Check login status | `/status` |
| `/help` | Show help message | `/help` |

---

## 💰 Chat Examples (After Login)

### Record Expenses
```
Beli kopi 30k pakai Gopay
Bayar listrik 200rb dari BCA
Makan siang 50rb tunai
```

### Record Income
```
Gaji 5 juta ke BCA
Bonus 1 juta ke Gopay
Freelance 2 juta ke Mandiri
```

### Financial Analysis
```
Analisis pengeluaran bulan ini
Berapa total pengeluaran hari ini?
Breakdown spending by category
What's my biggest expense?
```

### General Questions
```
Berapa saldo total saya?
Show my budget status
How much did I save this month?
```

---

## 🔧 Admin Commands (Setup/Troubleshooting)

### Check Webhook Status
```bash
curl https://fundy.id/api/telegram/setup
```

### Initialize Database
```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "init_database"}'
```

### Set Webhook
```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "set_webhook", "webhookUrl": "https://fundy.id/api/telegram/webhook"}'
```

### Delete Webhook
```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_webhook"}'
```

### Get Webhook Info
```bash
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "get_webhook_info"}'
```

---

## 📱 Bot Links

- **Telegram:** https://t.me/FundyIDbot
- **BotFather:** https://t.me/BotFather (to manage bot settings)

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Bot not responding | Run `npm run setup-telegram` |
| Can't login | Verify credentials work on web |
| Webhook not set | Run setup script again |
| Database error | Check DATABASE_URL in Vercel |
| AI not working | Verify GROQ_API_KEY in Vercel |

---

## 📊 Monitoring

### Check Active Sessions
```sql
SELECT COUNT(*) FROM telegram_sessions WHERE is_authenticated = true;
```

### View Recent Activity
```sql
SELECT telegram_user_id, first_name, last_activity 
FROM telegram_sessions 
ORDER BY last_activity DESC 
LIMIT 10;
```

### Check Recent Transactions via Telegram
```sql
SELECT t.description, t.amount, t.type, t.created_at
FROM transactions t
JOIN telegram_sessions ts ON t.user_id = ts.fundy_user_id
WHERE ts.last_activity > NOW() - INTERVAL '1 day'
ORDER BY t.created_at DESC;
```

---

## 🎯 Most Common Operations

### 1. First Time Setup
```bash
# 1. Add TELEGRAM_BOT_TOKEN to Vercel
# 2. Redeploy
# 3. Run setup
npm run setup-telegram
```

### 2. Reset Everything
```bash
# Delete webhook
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_webhook"}'

# Re-initialize
npm run setup-telegram
```

### 3. Verify Setup
```bash
# Check webhook
curl https://fundy.id/api/telegram/setup

# Test in Telegram
# Send /start to @FundyIDbot
```

---

## 📚 Documentation

- 📖 [Complete Setup Guide](./TELEGRAM_BOT_SETUP.md)
- ⚡ [Quick Start (3 Steps)](./TELEGRAM_QUICK_START.md)
- ✅ [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- 📊 [Integration Summary](./TELEGRAM_INTEGRATION_SUMMARY.md)

---

**Need Help?** Check Vercel logs or review the troubleshooting guides!

