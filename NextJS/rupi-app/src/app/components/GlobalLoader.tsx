'use client';

import { useSession } from 'next-auth/react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useEffect, useState } from 'react';

interface GlobalLoaderProps {
  children: React.ReactNode;
}

export default function GlobalLoader({ children }: GlobalLoaderProps) {
  const { state } = useFinancialData();
  const { data: session, status } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if all critical data is loaded
  const isDataLoaded = !state.loading.initial && 
    state.data.transactions.length >= 0 && 
    state.data.expenses.length >= 0 && 
    state.data.income.length >= 0 &&
    state.data.savings.length >= 0 &&
    state.data.budgets.length >= 0;

  // Check if session is ready
  const isSessionReady = status !== 'loading' && session;

  useEffect(() => {
    // Mark as initialized when data is loaded and session is ready
    if (isDataLoaded && isSessionReady) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, isSessionReady]);

  // Show loading screen while data is being fetched
  if (!isInitialized || status === 'loading' || state.loading.initial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              Fundy
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Your Personal Finance Dashboard
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex flex-col items-center space-y-4">
            {/* Spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-spin border-t-emerald-600 dark:border-t-emerald-400"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-emerald-600 dark:border-t-emerald-400 opacity-20"></div>
            </div>

            {/* Loading Text */}
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              {status === 'loading' ? 'Authenticating...' : 
               state.loading.initial ? 'Loading your financial data...' : 
               'Preparing your dashboard...'}
            </div>

            {/* Progress Indicators */}
            <div className="flex space-x-2">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                state.data.transactions.length >= 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                state.data.expenses.length >= 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                state.data.income.length >= 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                state.data.savings.length >= 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                state.data.budgets.length >= 0 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}></div>
            </div>
          </div>

          {/* Loading Steps */}
          <div className="mt-8 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className={`transition-opacity duration-300 ${
              state.data.transactions.length >= 0 ? 'opacity-100' : 'opacity-50'
            }`}>
              ✓ Transactions loaded
            </div>
            <div className={`transition-opacity duration-300 ${
              state.data.expenses.length >= 0 ? 'opacity-100' : 'opacity-50'
            }`}>
              ✓ Expenses loaded
            </div>
            <div className={`transition-opacity duration-300 ${
              state.data.income.length >= 0 ? 'opacity-100' : 'opacity-50'
            }`}>
              ✓ Income loaded
            </div>
            <div className={`transition-opacity duration-300 ${
              state.data.savings.length >= 0 ? 'opacity-100' : 'opacity-50'
            }`}>
              ✓ Savings loaded
            </div>
            <div className={`transition-opacity duration-300 ${
              state.data.budgets.length >= 0 ? 'opacity-100' : 'opacity-50'
            }`}>
              ✓ Budgets loaded
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show children when everything is loaded
  return <>{children}</>;
}
