'use client';
import { useState, useEffect } from 'react';
import BalanceOverview from '@/app/components/BalanceOverview';
import FinancialSummary from '@/app/components/FinancialSummary';
import IncomeExpenseSummary from '@/app/components/IncomeExpenseSummary';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import TrendsChart from '@/app/components/TrendsChart';
import AIInsights from '@/app/components/AIInsights';
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
  'ai-insights': AIInsights,
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
      case 'ai-insights':
        return 'col-span-2 md:col-span-2'; // AI Insights - 2x1
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

  // Natural heights for better visual appeal
  const getHeightClass = (componentKey: keyof typeof DASHBOARD_COMPONENTS) => {
    switch (componentKey) {
      // Top Row: Summary cards - increased heights to prevent overflow
      case 'financial-summary':
      case 'income-expense':
        return 'h-56'; // Increased height to prevent overflow
      case 'balance-overview':
        return 'h-56'; // Same height as other cards but wider
      // Row 2: Analytics and Category Breakdown
      case 'trends-chart':
        return 'h-80'; // Large height for analytics chart
      case 'category-breakdown':
        return 'h-80'; // Same height as analytics
      // Right side components
      case 'financial-health':
        return 'h-56'; // Same height as other top row cards
      case 'budget-tracking':
        return 'h-80'; // Same height as analytics
      case 'savings-goals':
        return 'h-80'; // Same height as analytics
      // Bottom Row: Recent Transactions
      case 'recent-transactions':
        return 'h-80'; // Same height as analytics
      case 'ai-insights':
        return 'h-80'; // Same height as other cards
      default:
        return 'h-80';
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left Side - 4 column grid */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Row: Balance Overview, Financial Summary, Income/Expense (2:1:1) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Balance Overview - takes 2 columns */}
            <div className="lg:col-span-2 hover-lift animate-stagger" style={{ animationDelay: '0.05s' }}>
              <DashboardWidgetWrapper 
                componentKey="balance-overview" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Financial Summary - takes 1 column */}
            <div className="lg:col-span-1 hover-lift animate-stagger" style={{ animationDelay: '0.1s' }}>
              <DashboardWidgetWrapper 
                componentKey="financial-summary" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Income/Expense - takes 1 column */}
            <div className="lg:col-span-1 hover-lift animate-stagger" style={{ animationDelay: '0.15s' }}>
              <DashboardWidgetWrapper 
                componentKey="income-expense" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
          </div>
          
          {/* Analytics Row: Analytics (3 columns) + Category Breakdown (1 column) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Analytics - takes 3 columns */}
            <div className="lg:col-span-3 hover-lift animate-stagger" style={{ animationDelay: '0.2s' }}>
              <DashboardWidgetWrapper 
                componentKey="trends-chart" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
            {/* Category Breakdown - takes 1 column */}
            <div className="lg:col-span-1 hover-lift animate-stagger" style={{ animationDelay: '0.25s' }}>
              <DashboardWidgetWrapper 
                componentKey="category-breakdown" 
                getColSpanClass={getColSpanClass}
                getHeightClass={getHeightClass}
              />
            </div>
          </div>
          
          {/* Recent Transactions - takes 4 columns (full width) */}
          <div className="hover-lift animate-stagger" style={{ animationDelay: '0.3s' }}>
            <DashboardWidgetWrapper 
              componentKey="recent-transactions" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
        </div>
        
        {/* Right Side - 2 column grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Health - takes 2 columns (full width) */}
          <div className="hover-lift animate-stagger" style={{ animationDelay: '0.1s' }}>
            <DashboardWidgetWrapper 
              componentKey="financial-health" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
          
          {/* Savings Goals - takes 2 columns (full width) */}
          <div className="hover-lift animate-stagger" style={{ animationDelay: '0.2s' }}>
            <DashboardWidgetWrapper 
              componentKey="savings-goals" 
              getColSpanClass={getColSpanClass}
              getHeightClass={getHeightClass}
            />
          </div>
          
          {/* Budget Tracking - takes 2 columns (full width) */}
          <div className="hover-lift animate-stagger" style={{ animationDelay: '0.3s' }}>
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
