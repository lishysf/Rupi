'use client';

import DashboardEditor from '@/app/components/DashboardEditor';
import NotificationCenter from '@/app/components/NotificationCenter';
import FloatingChat from '@/app/components/FloatingChat';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Rupi
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Smart Expense Tracker
              </div>
            </div>
            <NotificationCenter />
          </div>
        </div>
      </header>

      {/* Main Dashboard with Editor */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardEditor />
      </main>

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}