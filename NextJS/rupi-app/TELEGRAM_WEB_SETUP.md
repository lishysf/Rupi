# 🌐 Telegram Bot Web Setup

Since Vercel doesn't allow running scripts after deployment, I've created a web-based setup interface.

## 🚀 Quick Setup (3 Steps)

### Step 1: Add Environment Variable to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   ```
   Name: TELEGRAM_BOT_TOKEN
   Value: 7610542955:AAE8Q2cD1ysFC3VInZm94i5j6-PGmLv867E
   ```
4. Select all environments (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your app

### Step 2: Use Web Setup Interface

After redeployment, visit:

**🌐 https://fundy.id/telegram-setup**

Click the **"Run Setup"** button to automatically:
- ✅ Initialize database tables
- ✅ Configure Telegram webhook
- ✅ Verify the setup

### Step 3: Test Your Bot

1. Open Telegram
2. Search for: **@FundyIDbot** or visit: https://t.me/FundyIDbot
3. Send `/start`
4. Send `/login`
5. Enter your email and password
6. Try: "Beli kopi 30k pakai Gopay"

---

## 🎯 What the Web Setup Does

The web interface at `/telegram-setup` provides:

### Visual Setup Process
- **Step 1:** Initialize Database Tables
- **Step 2:** Configure Telegram Webhook  
- **Step 3:** Verify Setup

### Real-time Feedback
- ✅ Success indicators
- ❌ Error messages with details
- 🔄 Progress indicators
- 📊 Webhook status display

### Troubleshooting Info
- Environment variable checks
- Webhook configuration status
- Error diagnostics
- Quick links to Telegram

---

## 🔧 Manual Setup (Alternative)

If you prefer command line or the web interface doesn't work:

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
  -d '{
    "action": "set_webhook",
    "webhookUrl": "https://fundy.id/api/telegram/webhook"
  }'
```

### Verify Setup
```bash
curl https://fundy.id/api/telegram/setup
```

---

## 🐛 Troubleshooting

### Web Setup Page Not Loading
- Make sure your app is deployed
- Check that the route exists: `/telegram-setup`
- Verify no build errors in Vercel

### Setup Fails
1. **Check Environment Variable:**
   - Verify `TELEGRAM_BOT_TOKEN` is set in Vercel
   - Make sure it's the correct token from BotFather

2. **Check Database Connection:**
   - Verify `DATABASE_URL` is set
   - Test database connectivity

3. **Check Vercel Logs:**
   - Go to Vercel dashboard → Logs
   - Look for errors in the setup requests

### Bot Not Responding After Setup
1. **Verify Webhook:**
   ```bash
   curl https://fundy.id/api/telegram/setup
   ```
   Should show webhook URL is set

2. **Test Webhook Endpoint:**
   ```bash
   curl https://fundy.id/api/telegram/webhook
   ```
   Should return webhook info

3. **Check Telegram:**
   - Make sure you're messaging the correct bot: @FundyIDbot
   - Try sending `/start`

---

## 📱 Usage After Setup

### User Commands
- `/start` - Welcome message
- `/login` - Login with Fundy account
- `/logout` - Logout
- `/status` - Check login status
- `/help` - Show help

### Chat Examples
```
User: Beli kopi 30k pakai Gopay
Bot: ✅ Expense recorded: Beli kopi for Rp30,000 in Food & Drinks category using Gopay.

User: Analisis pengeluaran bulan ini
Bot: 📊 This month's spending analysis:
     - Total expenses: Rp2,450,000
     - Top category: Food & Drinks (Rp800,000)
     ...
```

---

## 🔄 Reset Setup

If you need to reset everything:

1. **Delete Webhook:**
   ```bash
   curl -X POST https://fundy.id/api/telegram/setup \
     -H "Content-Type: application/json" \
     -d '{"action": "delete_webhook"}'
   ```

2. **Re-run Setup:**
   - Visit https://fundy.id/telegram-setup
   - Click "Run Setup" again

---

## 📊 Monitoring

### Check Setup Status
Visit: https://fundy.id/telegram-setup

### Check Webhook Status
```bash
curl https://fundy.id/api/telegram/setup
```

### Check Vercel Logs
- Go to Vercel dashboard
- Click on your project
- Click "Logs" tab
- Look for webhook requests

---

## ✅ Success Indicators

Your setup is successful when:

- [ ] Web setup page shows all green checkmarks
- [ ] Webhook URL is set correctly
- [ ] No pending errors
- [ ] Bot responds to `/start` in Telegram
- [ ] Users can login with `/login`
- [ ] Transactions are recorded correctly

---

## 🎉 You're Done!

Once setup is complete:

1. **Share your bot:** https://t.me/FundyIDbot
2. **Monitor usage** via Vercel logs
3. **Test with real users**
4. **Gather feedback and iterate**

Your Telegram bot is now live and ready to help users manage their finances! 🚀

---

**Need Help?** Check the troubleshooting section above or review the complete setup guide.
