import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';
import { TelegramDatabase } from '@/lib/telegram-database';

// Setup endpoint to configure webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, webhookUrl } = body;

    if (action === 'set_webhook') {
      if (!webhookUrl) {
        return NextResponse.json({
          success: false,
          error: 'webhookUrl is required'
        }, { status: 400 });
      }

      // Initialize database tables
      await TelegramDatabase.initializeTables();

      // Set webhook
      const success = await TelegramBotService.setWebhook(webhookUrl);

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Webhook set successfully',
          webhookUrl
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to set webhook'
        }, { status: 500 });
      }
    }

    if (action === 'delete_webhook') {
      const success = await TelegramBotService.deleteWebhook();

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Webhook deleted successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to delete webhook'
        }, { status: 500 });
      }
    }

    if (action === 'get_webhook_info') {
      const info = await TelegramBotService.getWebhookInfo();
      return NextResponse.json({
        success: true,
        webhookInfo: info
      });
    }

    if (action === 'init_database') {
      await TelegramDatabase.initializeTables();
      return NextResponse.json({
        success: true,
        message: 'Database tables initialized with auth state support'
      });
    }

    if (action === 'migrate_auth_state') {
      try {
        // Add auth state columns to existing tables
        await TelegramDatabase.initializeTables();
        return NextResponse.json({
          success: true,
          message: 'Auth state columns added to existing tables'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: set_webhook, delete_webhook, get_webhook_info, or init_database'
    }, { status: 400 });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get webhook status
export async function GET() {
  try {
    const info = await TelegramBotService.getWebhookInfo();
    return NextResponse.json({
      success: true,
      webhookInfo: info
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get webhook info'
    }, { status: 500 });
  }
}

