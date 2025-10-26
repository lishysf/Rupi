import { NextRequest, NextResponse } from 'next/server';

// In-memory store for updates (in production, use Redis or database)
const pendingUpdates = new Map<string, Array<{
  type: 'transaction_created' | 'wallet_updated';
  data: any;
  timestamp: number;
}>>();

// Function to add updates for a user
export function addUserUpdate(userId: string, type: 'transaction_created' | 'wallet_updated', data: any) {
  if (!pendingUpdates.has(userId)) {
    pendingUpdates.set(userId, []);
  }
  
  const updates = pendingUpdates.get(userId)!;
  updates.push({
    type,
    data,
    timestamp: Date.now()
  });
  
  // Keep only last 10 updates per user to prevent memory bloat
  if (updates.length > 10) {
    updates.splice(0, updates.length - 10);
  }
  
  console.log(`📡 Added ${type} update for user ${userId}`);
}

// Function to get updates since a timestamp
function getUserUpdates(userId: string, since: number) {
  const updates = pendingUpdates.get(userId) || [];
  return updates.filter(update => update.timestamp > since);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const since = parseInt(searchParams.get('since') || '0');

  console.log(`📡 Polling request from user ${userId} since ${since}`);

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const updates = getUserUpdates(userId, since);
    
    console.log(`📡 Returning ${updates.length} updates for user ${userId}`);
    
    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error getting polling updates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
