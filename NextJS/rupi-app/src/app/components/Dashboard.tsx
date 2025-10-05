'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardEditor from '@/app/components/DashboardEditor';
import FloatingChat from '@/app/components/FloatingChat';
import Sidebar from '@/app/components/Sidebar';
import GlobalLoader from '@/app/components/GlobalLoader';
import { FinancialDataProvider } from '@/contexts/FinancialDataContext';

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
      <GlobalLoader>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex">
          {/* Sidebar */}
          <Sidebar currentPage="Dashboard" />

          {/* Main content area */}
          <div className="flex-1 lg:ml-64">
            {/* Header */}
            <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40 shadow-sm">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-4 lg:ml-0 ml-16">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      Dashboard
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Dashboard with Editor */}
            <main className="px-4 sm:px-6 lg:px-8 py-8">
              <DashboardEditor />
            </main>
          </div>

          {/* Floating Chat */}
          <FloatingChat />
        </div>
      </GlobalLoader>
    </FinancialDataProvider>
  );
}