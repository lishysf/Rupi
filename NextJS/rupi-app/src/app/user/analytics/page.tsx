'use client';

import Sidebar from '@/app/components/Sidebar';
import NotificationCenter from '@/app/components/NotificationCenter';
import TrendsChart from '@/app/components/TrendsChart';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import { FinancialDataProvider } from '@/contexts/FinancialDataContext';

export default function UserAnalyticsPage() {
  return (
    <FinancialDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex">
        <Sidebar currentPage="Table" />
        <div className="flex-1 lg:ml-64">
          <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-40">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Table</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">Edit your financial data</div>
                </div>
                <div className="flex items-center space-x-4">
                  <NotificationCenter />
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {/* Row 1: Income vs Expense 1x4 */}
              <div className="col-span-2 md:col-span-4 h-72 md:h-96">
                <div className="h-full">
                  <TrendsChart widgetSize={'half'} />
                </div>
              </div>

              {/* Row 2: Pie chart 2x2 */}
              <div className="col-span-2 md:col-span-2 h-72 md:h-80">
                <div className="h-full">
                  <CategoryBreakdown widgetSize={'half'} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </FinancialDataProvider>
  );
}


