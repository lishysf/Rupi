# 🚀 Telegram Bot Quick Start

Get your Fundy Telegram bot up and running in 3 steps!

## ⚡ Quick Setup (3 Steps)

### 1️⃣ Add Environment Variable to Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```
Name: TELEGRAM_BOT_TOKEN
Value: 7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E
```

Then **redeploy** your app.

### 2️⃣ Run Setup via Web Interface

After redeployment, visit the setup page:

**🌐 Open: https://fundy.id/telegram-setup**

Click "Run Setup" button to:
- Initialize database tables
- Configure Telegram webhook
- Verify the setup

Or manually with curl:

```bash
# Initialize database
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "init_database"}'

# Set webhook
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "set_webhook", "webhookUrl": "https://fundy.id/api/telegram/webhook"}'
```

### 3️⃣ Test Your Bot

Open Telegram and search for: **@FundyIDbot** or visit: https://t.me/FundyIDbot

Send these commands:
1. `/start` - Start the bot
2. `/login` - Login with your Fundy account
3. Start chatting!

---

## 💬 How to Use

### Login Process
1. Send `/login`
2. Enter your Fundy email (e.g., user@example.com)
3. Enter your password
4. ✅ You're logged in!

### Chat Examples
- **Record expense:** "Beli kopi 30k pakai Gopay"
- **Record income:** "Gaji 5 juta ke BCA"
- **Analyze spending:** "Analisis pengeluaran bulan ini"
- **Check balance:** "Berapa total saldo saya?"

### Commands
- `/start` - Welcome message
- `/login` - Authenticate
- `/status` - Check login status
- `/logout` - Logout
- `/help` - Show help

---

## 🔍 Verify Setup

Check webhook status:
```bash
curl https://fundy.id/api/telegram/setup
```

Should return:
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

---

## 🐛 Troubleshooting

### Bot not responding?
1. Check environment variable is set in Vercel
2. Verify webhook: `curl https://fundy.id/api/telegram/setup`
3. Check Vercel logs for errors

### Can't login?
1. Use your Fundy web account credentials
2. Check `/status` to see if already logged in
3. Try `/logout` then `/login` again

### Need to reset webhook?
```bash
# Delete webhook
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_webhook"}'

# Set webhook again
curl -X POST https://fundy.id/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action": "set_webhook", "webhookUrl": "https://fundy.id/api/telegram/webhook"}'
```

---

## 📱 Share Your Bot

Your bot is live at: **https://t.me/FundyIDbot**

Share it with your users! 🎉

---

## 📚 Need More Details?

See [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) for the complete guide.

