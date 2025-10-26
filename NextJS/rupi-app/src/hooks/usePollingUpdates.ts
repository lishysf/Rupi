import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface PollingUpdate {
  type: 'transaction_created' | 'wallet_updated';
  data: any;
  timestamp: number;
}

export function usePollingUpdates() {
  const { data: session } = useSession();
  const { refreshAfterTransaction, refreshAll } = useFinancialData();
  const lastUpdateRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) {
      console.log('🔌 No session user ID, skipping polling updates');
      return;
    }

    console.log(`🔌 Setting up polling updates for user: ${session.user.id}`);

    const pollForUpdates = async () => {
      if (isPollingRef.current) return; // Prevent overlapping requests
      
      try {
        isPollingRef.current = true;
        
        const response = await fetch(`/api/polling-updates?userId=${session.user.id}&since=${lastUpdateRef.current}`);
        
        if (response.ok) {
          const updates: PollingUpdate[] = await response.json();
          
          if (updates.length > 0) {
            console.log(`📡 Received ${updates.length} polling updates:`, updates);
            
            for (const update of updates) {
              switch (update.type) {
                case 'transaction_created':
                  console.log('📡 Polling: Transaction created, refreshing dashboard');
                  refreshAfterTransaction();
                  break;
                  
                case 'wallet_updated':
                  console.log('📡 Polling: Wallet updated, refreshing all data');
                  refreshAll();
                  break;
              }
              
              // Update the last seen timestamp
              lastUpdateRef.current = Math.max(lastUpdateRef.current, update.timestamp);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Start polling immediately
    pollForUpdates();
    
    // Set up interval polling (every 3 seconds)
    intervalRef.current = setInterval(pollForUpdates, 3000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session?.user?.id, refreshAfterTransaction, refreshAll]);

  // Return polling status for debugging
  return {
    isPolling: isPollingRef.current,
    lastUpdate: lastUpdateRef.current
  };
}
