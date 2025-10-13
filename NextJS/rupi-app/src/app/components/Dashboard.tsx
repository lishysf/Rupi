'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardEditor from '@/app/components/DashboardEditor';
import FloatingChat from '@/app/components/FloatingChat';
import Sidebar from '@/app/components/Sidebar';
import GlobalLoader from '@/app/components/GlobalLoader';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';

// Inner component that has access to the financial data context
function DashboardContent() {
  // Data is automatically loaded by the FinancialDataProvider
  // No need to manually refresh on mount

  return (
    <GlobalLoader>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <Sidebar currentPage="Dashboard" />

        {/* Main content area */}
        <div className="flex-1 lg:ml-64">
          {/* Main Dashboard with Editor */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <DashboardEditor />
          </main>
        </div>

        {/* Floating Chat */}
        <FloatingChat />
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