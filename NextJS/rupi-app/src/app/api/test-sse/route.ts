import { NextRequest, NextResponse } from 'next/server';
import { broadcastTransactionUpdate } from '@/app/api/events/route';

export async function POST(request: NextRequest) {
  try {
    const { userId, testData } = await request.json();
    
    console.log(`🧪 Test SSE broadcast to user: ${userId}`);
    console.log(`🧪 Test data:`, testData);
    
    // Send a test broadcast
    broadcastTransactionUpdate(userId, {
      type: 'test',
      message: 'This is a test broadcast',
      timestamp: Date.now(),
      ...testData
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Test broadcast sent to user ${userId}` 
    });
  } catch (error) {
    console.error('Test SSE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
