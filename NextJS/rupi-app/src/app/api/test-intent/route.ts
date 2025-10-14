import { NextRequest, NextResponse } from 'next/server';
import { GroqAIService } from '@/lib/groq-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Test intent detection
    const intent = await GroqAIService.analyzeMessageIntent(message);
    
    return NextResponse.json({
      success: true,
      data: {
        message,
        detectedIntent: intent,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Intent detection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test all intent detection cases
export async function GET() {
  try {
    await GroqAIService.testIntentDetection();
    
    return NextResponse.json({
      success: true,
      message: 'Intent detection test completed. Check console for results.'
    });

  } catch (error) {
    console.error('Intent detection test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run intent detection test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
