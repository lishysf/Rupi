import { NextRequest } from 'next/server';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Function to broadcast transaction updates to all connected clients
export function broadcastTransactionUpdate(userId: string, transactionData: any) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const data = JSON.stringify({
        type: 'transaction_created',
        data: transactionData,
        timestamp: Date.now()
      });
      
      connection.enqueue(`data: ${data}\n\n`);
      console.log(`📡 Broadcasted transaction update to user ${userId}`);
    } catch (error) {
      console.error('Error broadcasting to user:', error);
      connections.delete(userId);
    }
  }
}

// Function to broadcast wallet updates
export function broadcastWalletUpdate(userId: string, walletData: any) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const data = JSON.stringify({
        type: 'wallet_updated',
        data: walletData,
        timestamp: Date.now()
      });
      
      connection.enqueue(`data: ${data}\n\n`);
      console.log(`📡 Broadcasted wallet update to user ${userId}`);
    } catch (error) {
      console.error('Error broadcasting wallet update:', error);
      connections.delete(userId);
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID required', { status: 400 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(userId, controller);
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to real-time updates',
        timestamp: Date.now()
      })}\n\n`);

      console.log(`🔌 User ${userId} connected to real-time updates`);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔌 User ${userId} disconnected from real-time updates`);
        connections.delete(userId);
        controller.close();
      });
    },
    cancel() {
      console.log(`🔌 User ${userId} connection cancelled`);
      connections.delete(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
