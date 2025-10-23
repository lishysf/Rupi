'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardEditor from '@/app/components/DashboardEditor';
import FloatingChat from '@/app/components/FloatingChat';
import Sidebar from '@/app/components/Sidebar';
import GlobalLoader from '@/app/components/GlobalLoader';
import TutorialBubble from '@/app/components/TutorialBubble';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';

// Inner component that has access to the financial data context
function DashboardContent() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const { state } = useFinancialData();

  // Show loading spinner while initial data is loading
  if (state.loading.initial) {
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <Sidebar currentPage="Dashboard" />

        {/* Main content area */}
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (state.error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <Sidebar currentPage="Dashboard" />

        {/* Main content area */}
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <GlobalLoader>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <Sidebar currentPage="Dashboard" />

        {/* Main content area */}
        <div className="flex-1 lg:ml-64">
          {/* Main Dashboard with Editor */}
          <main className="px-2 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 pt-16 lg:pt-4 pb-20 lg:pb-8">
            <DashboardEditor />
          </main>
        </div>

        {/* Floating Chat */}
        <FloatingChat />
        
        {/* Tutorial Bubble */}
        <TutorialBubble 
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onStart={() => setIsTutorialOpen(true)}
        />
      </div>
    </GlobalLoader>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);


  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    <FinancialDataProvider>
      <DashboardContent />
    </FinancialDataProvider>
  );
}