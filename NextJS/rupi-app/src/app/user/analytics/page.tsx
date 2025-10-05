'use client';

import Sidebar from '@/app/components/Sidebar';
import NotificationCenter from '@/app/components/NotificationCenter';
import TrendsChart from '@/app/components/TrendsChart';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import { FinancialDataProvider } from '@/contexts/FinancialDataContext';

export default function UserAnalyticsPage() {
  return (
    <FinancialDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex">
        <Sidebar currentPage="Analytics" />
        <div className="flex-1 lg:ml-64">
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Analytics</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Insights and breakdowns</div>
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


