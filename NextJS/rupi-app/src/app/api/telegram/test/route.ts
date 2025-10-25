import { NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN not set',
        status: 'error'
      }, { status: 500 });
    }
    
    // Test bot token by getting webhook info
    const webhookInfo = await TelegramBotService.getWebhookInfo();
    
    return NextResponse.json({ 
      status: 'ok',
      botToken: botToken.substring(0, 10) + '...',
      webhookInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}