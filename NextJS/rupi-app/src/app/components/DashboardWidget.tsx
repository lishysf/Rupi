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
  'balance-overview': ['transactions', 'expenses', 'income'],
  'financial-summary': ['transactions', 'expenses', 'income'],
  'income-expense': ['expenses', 'income'],
  'category-breakdown': ['expenses'],
  'trends-chart': ['expenses'],
  'ai-insights': ['transactions', 'expenses', 'income'],
  'recent-transactions': ['transactions'],
  'budget-tracking': ['budgets'], // Simplified - only needs budgets
  'savings-goals': ['savings'],
  'financial-health': ['transactions', 'expenses', 'income'], // Simplified - removed savings dependency
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
  
  // Show skeleton if data is loading and skeleton is enabled
  if (showSkeleton && (isDataLoading || !isDataLoaded)) {
    return (
      <div className={`${className} animate-fade-in`}>
        <LoadingSkeleton type={dataKey} />
      </div>
    );
  }
  
  return (
    <div className={`${className} content-ready`}>
      {children}
    </div>
  );
}
