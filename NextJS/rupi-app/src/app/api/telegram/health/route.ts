import { NextResponse } from 'next/server';

// Health check endpoint for Telegram webhook
export async function GET() {
  try {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      botToken: !!process.env.TELEGRAM_BOT_TOKEN,
      webhookUrl: 'https://www.fundy.id/api/telegram/webhook',
      supportedMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'TRACE']
    };

    return NextResponse.json({
      success: true,
      health: healthInfo
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle any other HTTP methods
export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Health check endpoint - use GET method'
  });
}
