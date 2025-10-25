/**
 * Telegram Bot Webhook Setup Script
 * 
 * This script configures the Telegram webhook for the Fundy bot.
 * Run this after deploying to Vercel.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DOMAIN = process.env.NEXTAUTH_URL || 'https://fundy.id';
const WEBHOOK_URL = `${DOMAIN}/api/telegram/webhook`;

async function setupWebhook() {
  console.log('🤖 Fundy Telegram Bot Setup');
  console.log('================================');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log('');

  try {
    // Step 1: Initialize database
    console.log('📦 Step 1: Initializing database tables...');
    const initResponse = await fetch(`${DOMAIN}/api/telegram/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'init_database'
      })
    });

    const initData = await initResponse.json();
    if (initData.success) {
      console.log('✅ Database tables initialized successfully');
    } else {
      console.log('⚠️  Database initialization warning:', initData.error);
      console.log('   (This is OK if tables already exist)');
    }

    // Step 2: Delete existing webhook (if any)
    console.log('\n🗑️  Step 2: Deleting existing webhook...');
    const deleteResponse = await fetch(`${DOMAIN}/api/telegram/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_webhook'
      })
    });

    const deleteData = await deleteResponse.json();
    if (deleteData.success) {
      console.log('✅ Existing webhook deleted');
    } else {
      console.log('⚠️  No existing webhook to delete');
    }

    // Step 3: Set new webhook
    console.log('\n🔗 Step 3: Setting new webhook...');
    const setResponse = await fetch(`${DOMAIN}/api/telegram/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'set_webhook',
        webhookUrl: WEBHOOK_URL
      })
    });

    const setData = await setResponse.json();
    if (setData.success) {
      console.log('✅ Webhook set successfully');
    } else {
      console.error('❌ Failed to set webhook:', setData.error);
      process.exit(1);
    }

    // Step 4: Verify webhook
    console.log('\n🔍 Step 4: Verifying webhook...');
    const verifyResponse = await fetch(`${DOMAIN}/api/telegram/setup`);
    const verifyData = await verifyResponse.json();

    if (verifyData.success && verifyData.webhookInfo) {
      console.log('✅ Webhook verified successfully');
      console.log('\nWebhook Information:');
      console.log('-------------------');
      console.log('URL:', verifyData.webhookInfo.url || 'Not set');
      console.log('Has custom certificate:', verifyData.webhookInfo.has_custom_certificate || false);
      console.log('Pending updates:', verifyData.webhookInfo.pending_update_count || 0);
      console.log('Max connections:', verifyData.webhookInfo.max_connections || 40);
      
      if (verifyData.webhookInfo.last_error_message) {
        console.log('\n⚠️  Last error:', verifyData.webhookInfo.last_error_message);
        console.log('Last error date:', new Date(verifyData.webhookInfo.last_error_date * 1000).toLocaleString());
      }
    } else {
      console.error('❌ Failed to verify webhook');
      process.exit(1);
    }

    // Final instructions
    console.log('\n================================');
    console.log('✨ Setup Complete!');
    console.log('================================');
    console.log('\n📱 Your bot is ready at: https://t.me/FundyIDbot');
    console.log('\nNext steps:');
    console.log('1. Open Telegram and search for @FundyIDbot');
    console.log('2. Send /start to begin');
    console.log('3. Use /login to authenticate with your Fundy account');
    console.log('4. Start chatting with the AI!');
    console.log('\nCommands:');
    console.log('  /start  - Start the bot');
    console.log('  /login  - Login with email and password');
    console.log('  /status - Check login status');
    console.log('  /help   - Show available commands');
    console.log('  /logout - Logout from your account');
    console.log('\nExample messages:');
    console.log('  "Beli kopi 30k pakai Gopay"');
    console.log('  "Gaji 5 juta ke BCA"');
    console.log('  "Analisis pengeluaran bulan ini"');
    console.log('');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure TELEGRAM_BOT_TOKEN is set in Vercel environment variables');
    console.error('2. Verify your app is deployed and accessible at:', DOMAIN);
    console.error('3. Check Vercel logs for errors');
    console.error('4. Make sure DATABASE_URL is configured');
    process.exit(1);
  }
}

// Run setup
setupWebhook();
