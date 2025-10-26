import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface RealTimeEvent {
  type: 'transaction_created' | 'wallet_updated' | 'connected';
  data?: any;
  timestamp: number;
  message?: string;
}

export function useRealTimeUpdates() {
  const { data: session } = useSession();
  const { refreshAfterTransaction, refreshAll } = useFinancialData();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!session?.user?.id) {
      console.log('🔌 No session user ID, skipping SSE connection');
      return;
    }

    console.log(`🔌 Setting up SSE connection for user: ${session.user.id}`);
    console.log(`🔌 Session user object:`, session.user);

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/events?userId=${session.user.id}`;
      console.log(`🔌 Connecting to SSE endpoint: ${url}`);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🔌 Connected to real-time updates');
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: RealTimeEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('📡 Real-time connection established:', data.message);
              break;
              
            case 'transaction_created':
              console.log('📡 Received transaction update:', data.data);
              // Refresh dashboard data to show new transaction
              refreshAfterTransaction();
              break;
              
            case 'wallet_updated':
              console.log('📡 Received wallet update:', data.data);
              // Refresh wallet data
              refreshAll();
              break;
              
            default:
              console.log('📡 Unknown event type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        console.error('SSE readyState:', eventSource.readyState);
        console.error('SSE url:', eventSource.url);
        eventSource.close();
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [session?.user?.id, refreshAfterTransaction, refreshAll]);

  // Return connection status for debugging
  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnectAttempts: reconnectAttempts.current
  };
}
