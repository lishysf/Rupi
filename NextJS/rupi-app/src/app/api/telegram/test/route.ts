import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/telegram-bot';

// Test endpoint to verify bot functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, message } = body;

    if (!chatId) {
      return NextResponse.json({
        success: false,
        error: 'chatId is required'
      }, { status: 400 });
    }

    const testMessage = message || '🧪 Test message from Fundy bot!';
    
    console.log('🧪 Testing bot message sending...');
    console.log('🔑 Bot token available:', !!process.env.TELEGRAM_BOT_TOKEN);
    console.log('📤 Sending test message to:', chatId);
    
    const result = await TelegramBotService.sendMessage(chatId, testMessage);
    
    return NextResponse.json({
      success: result,
      message: result ? 'Test message sent successfully' : 'Failed to send test message',
      chatId,
      testMessage
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

// GET endpoint to check bot configuration
export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const hasToken = !!botToken;
    
    return NextResponse.json({
      success: true,
      botConfiguration: {
        hasToken,
        tokenPreview: hasToken ? `${botToken.substring(0, 10)}...` : 'NOT SET',
        environment: process.env.NODE_ENV,
        apiUrl: hasToken ? `https://api.telegram.org/bot${botToken.substring(0, 10)}...` : 'NOT AVAILABLE'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
