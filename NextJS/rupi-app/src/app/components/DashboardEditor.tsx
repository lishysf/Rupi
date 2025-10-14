'use client';
import { useState, useEffect } from 'react';
import BalanceOverview from '@/app/components/BalanceOverview';
import FinancialSummary from '@/app/components/FinancialSummary';
import IncomeExpenseSummary from '@/app/components/IncomeExpenseSummary';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import TrendsChart from '@/app/components/TrendsChart';
import RecentTransactions from '@/app/components/RecentTransactions';
import BudgetTracking from '@/app/components/BudgetTracking';
import SavingsGoals from '@/app/components/SavingsGoals';
import FinancialHealthScore from '@/app/components/FinancialHealthScore';
import LoadingSkeleton from '@/app/components/LoadingSkeleton';
import DashboardWidget from '@/app/components/DashboardWidget';

// Dashboard components mapping
const DASHBOARD_COMPONENTS = {
  'balance-overview': BalanceOverview,
  'financial-summary': FinancialSummary,
  'income-expense': IncomeExpenseSummary,
  'category-breakdown': CategoryBreakdown,
  'trends-chart': TrendsChart,
  'recent-transactions': RecentTransactions,
  'budget-tracking': BudgetTracking,
  'savings-goals': SavingsGoals,
  'financial-health': FinancialHealthScore,
} as const;

// Dashboard widget component
function DashboardWidgetWrapper({ 
  componentKey,
  getColSpanClass,
  getHeightClass
}: {
  componentKey: keyof typeof DASHBOARD_COMPONENTS;
  getColSpanClass: (componentKey: keyof typeof DASHBOARD_COMPONENTS) => string;
  getHeightClass: (componentKey: keyof typeof DASHBOARD_COMPONENTS) => string;
}) {
  const Component = DASHBOARD_COMPONENTS[componentKey];

  return (
    <DashboardWidget 
      dataKey={componentKey}
      className={`${getColSpanClass(componentKey)}`}
    >
      <div className={`${getHeightClass(componentKey)} w-full`}>
        <Component widgetSize={'half'} />
      </div>
    </DashboardWidget>
  );
}

export default function DashboardEditor() {

  // Fixed dashboard layout - no editing functionality

  // Get proper Tailwind class for grid column span
  const getColSpanClass = (componentKey: keyof typeof DASHBOARD_COMPONENTS) => {
    switch (componentKey) {
      // Row 1: Summary cards
      case 'balance-overview':
        return 'col-span-2 md:col-span-2'; // Total Balance - 2x1
      case 'financial-summary':
        return 'col-span-1 md:col-span-1'; // Financial Summary - 1x1
      case 'income-expense':
        return 'col-span-1 md:col-span-1'; // Income/Expense - 1x1
      // Row 2: Analytics (3 columns) and Category Breakdown (1 column)
      case 'trends-chart':
        return 'col-span-3 md:col-span-3'; // Analytics Chart - 3x1
      case 'category-breakdown':
        return 'col-span-1 md:col-span-1'; // Category Breakdown - 1x1
      // Row 3: Recent Transactions (4 columns full width)
      case 'recent-transactions':
        return 'col-span-4 md:col-span-4'; // Recent Transactions - 4x1
      // Right side components
      case 'financial-health':
        return 'col-span-2 md:col-span-2'; // Financial Health - 2x1
      case 'savings-goals':
        return 'col-span-2 md:col-span-2'; // Savings Goals - 2x1
      case 'budget-tracking':
        return 'col-span-2 md:col-span-2'; // Budget Tracking - 2x1
      default:
        return 'col-span-2';
    }
  };

  // Responsive heights for better visual appeal across all screen sizes
  const getHeightClass = (componentKey: keyof typeof DASHBOARD_COMPONENTS) => {
    switch (componentKey) {
      // Top Row: Summary cards - responsive heights
      case 'financial-summary':
        return 'h-48 sm:h-56'; // Smaller on mobile, larger on desktop
      case 'income-expense':
        return 'h-56 sm:h-56'; // Increased height on mobile, same on desktop
      case 'balance-overview':
        return 'h-48 sm:h-56'; // Same height as other cards but wider
      // Row 2: Analytics and Category Breakdown
      case 'trends-chart':
        return 'h-80 sm:h-72 lg:h-80'; // Increased height on mobile, same on desktop
      case 'category-breakdown':
        return 'h-90 sm:h-72 lg:h-80'; // Increased height on mobile, same on desktop
      // Right side components
      case 'financial-health':
        return 'h-60 sm:h-56'; // Same height as other top row cards
      case 'budget-tracking':
        return 'h-90 sm:h-72 lg:h-80'; // Same height as analytics
      case 'savings-goals':
        return 'h-90 sm:h-72 lg:h-80'; // Same height as analytics
      // Bottom Row: Recent Transactions
      case 'recent-transactions':
        return 'h-80 sm:h-72 lg:h-80'; // Same height as analytics
      default:
        return 'h-64 sm:h-72 lg:h-80';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-16 lg:pb-32">
      {/* Mobile-first responsive grid */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-4 sm:gap-6">
        {/* Left Side - Responsive column span */}
        <div className="xl:col-span-4 space-y-4 sm:space-y-6">
          {/* Top Row: Responsive grid for different screen sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Balance Overview - responsive column span */}
            <div className="sm:col-span-2 lg:col-span-2 hover-lift" data-tutorial="balance-overview">
              <DashboardWidgetWrapper 
                componentKey="balance-overview" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Financial Summary - responsive column span */}
            <div className="sm:col-span-1 lg:col-span-1 hover-lift" data-tutorial="financial-summary">
              <DashboardWidgetWrapper 
                componentKey="financial-summary" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Income/Expense - responsive column span */}
            <div className="sm:col-span-1 lg:col-span-1 hover-lift" data-tutorial="income-expense">
              <DashboardWidgetWrapper 
                componentKey="income-expense" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
          </div>
          
          {/* Analytics Row: Responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Analytics - responsive column span */}
            <div className="lg:col-span-3 hover-lift" data-tutorial="trends-chart">
              <DashboardWidgetWrapper 
                componentKey="trends-chart" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Category Breakdown - responsive column span */}
            <div className="lg:col-span-1 hover-lift" data-tutorial="category-breakdown">
              <DashboardWidgetWrapper 
                componentKey="category-breakdown" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
          </div>
          
          {/* Recent Transactions - full width on all screens */}
          <div className="hover-lift" data-tutorial="recent-transactions">
            <DashboardWidgetWrapper 
              componentKey="recent-transactions" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
          
        </div>
        
        {/* Right Side - Responsive column span */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Financial Health - full width on right side */}
          <div className="hover-lift" data-tutorial="financial-health">
            <DashboardWidgetWrapper 
              componentKey="financial-health" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
          
          {/* Savings Goals - full width on right side */}
          <div className="hover-lift" data-tutorial="savings-goals">
            <DashboardWidgetWrapper 
              componentKey="savings-goals" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
          
          {/* Budget Tracking - full width on right side */}
          <div className="hover-lift" data-tutorial="budget-tracking">
            <DashboardWidgetWrapper 
              componentKey="budget-tracking" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
