'use client';

import { useFinancialData } from '@/contexts/FinancialDataContext';
import LoadingSkeleton from '@/app/components/LoadingSkeleton';
import { ReactNode } from 'react';

interface DashboardWidgetProps {
  children: ReactNode;
  dataKey: keyof typeof DASHBOARD_DATA_KEYS;
  className?: string;
  showSkeleton?: boolean;
}

// Define which data each widget depends on
const DASHBOARD_DATA_KEYS = {
  'balance-overview': ['wallets'], // Only needs wallets for balance calculation
  'financial-summary': ['transactions', 'expenses', 'income', 'wallets', 'savings'], // Needs all for calculations
  'income-expense': ['expenses', 'income'],
  'category-breakdown': ['expenses'],
  'trends-chart': ['expenses'],
  'recent-transactions': ['transactions'],
  'budget-tracking': ['budgets'],
  'savings-goals': ['savings'],
  'financial-health': ['transactions', 'expenses', 'income', 'savings'], // Include savings for complete health score
} as const;

export default function DashboardWidget({ 
  children, 
  dataKey, 
  className = '',
  showSkeleton = true 
}: DashboardWidgetProps) {
  const { state } = useFinancialData();
  
  // Check if required data is loaded
  const requiredDataKeys = DASHBOARD_DATA_KEYS[dataKey];
  const isDataLoaded = requiredDataKeys.every(key => {
    const data = state.data[key];
    return Array.isArray(data) ? data.length >= 0 : true;
  });
  
  // Check if any of the required data is still loading
  const isDataLoading = requiredDataKeys.some(key => {
    return state.loading[key as keyof typeof state.loading];
  });
  
  // Also check if initial loading is still happening
  const isInitialLoading = state.loading.initial;
  
  // Show loading spinner if data is loading, initial loading, or data not loaded
  if (showSkeleton && (isDataLoading || !isDataLoaded || isInitialLoading)) {
    return (
      <div className={`${className} flex items-center justify-center min-h-full`}>
        <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
}
