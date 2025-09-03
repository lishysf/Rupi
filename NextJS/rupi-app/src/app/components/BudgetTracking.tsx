'use client';

import { Target, TrendingUp, AlertCircle } from 'lucide-react';

interface BudgetTrackingProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BudgetTracking({ widgetSize = 'medium' }: BudgetTrackingProps) {
  // Mock budget data
  const budgets = [
    {
      category: 'Food',
      budget: 3000000,
      spent: 2500000,
      color: 'emerald',
    },
    {
      category: 'Transport',
      budget: 1500000,
      spent: 1200000,
      color: 'blue',
    },
    {
      category: 'Entertainment',
      budget: 800000,
      spent: 600000,
      color: 'purple',
    },
    {
      category: 'Shopping',
      budget: 1000000,
      spent: 1150000, // Overspending
      color: 'red',
    },
    {
      category: 'Coffee',
      budget: 400000,
      spent: 280000,
      color: 'amber',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getBackgroundColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    if (percentage >= 80) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    return 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
  };

  const totalBudget = budgets.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const overallProgress = (totalSpent / totalBudget) * 100;

  // Adjust number of items based on widget size
  const getItemLimit = () => {
    switch (widgetSize) {
      case 'half': return 2;
      case 'medium': return 3;
      case 'long': return 5;
      default: return 3;
    }
  };

  const visibleBudgets = budgets.slice(0, getItemLimit());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Target className={`${
            widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'
          } text-blue-600 dark:text-blue-400 mr-2`} />
          <h2 className={`${
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } font-semibold text-slate-900 dark:text-white`}>
            Budget Tracking
          </h2>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Jan 2024
        </div>
      </div>

      {/* Overall Budget Summary */}
      <div className={`${
        widgetSize === 'half' ? 'mb-2 p-2' : 'mb-3 p-3'
      } bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex-shrink-0`}>
        <div className="flex justify-between items-center mb-1">
          <span className={`${
            widgetSize === 'half' ? 'text-xs' : 'text-sm'
          } font-medium text-blue-900 dark:text-blue-100`}>
            Monthly Budget
          </span>
          <span className="text-xs text-blue-700 dark:text-blue-300">
            {overallProgress.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className={`${
            widgetSize === 'half' ? 'text-sm' : 'text-lg'
          } font-bold text-blue-900 dark:text-blue-100`}>
            {formatCurrency(totalSpent)}
          </span>
          <span className="text-xs text-blue-700 dark:text-blue-300">
            of {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(totalSpent, totalBudget)}`}
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Individual Budget Items */}
      <div className={`flex-1 ${
        widgetSize === 'half' ? 'space-y-1' : 'space-y-2'
      } overflow-y-auto`}>
        {visibleBudgets.map((budget) => {
          const percentage = (budget.spent / budget.budget) * 100;
          const isOverspending = percentage >= 100;
          
          return (
            <div
              key={budget.category}
              className={`${
                widgetSize === 'half' ? 'p-1.5' : 'p-2'
              } rounded-lg border ${getBackgroundColor(budget.spent, budget.budget)}`}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <span className={`${
                    widgetSize === 'half' ? 'text-xs' : 'text-sm'
                  } font-medium text-slate-900 dark:text-white`}>
                    {budget.category}
                  </span>
                  {isOverspending && (
                    <AlertCircle className="w-3 h-3 text-red-500 ml-1" />
                  )}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {formatCurrency(budget.spent)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  / {formatCurrency(budget.budget)}
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${getProgressColor(budget.spent, budget.budget)}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className={`${
        widgetSize === 'half' ? 'mt-2 pt-2' : 'mt-3 pt-3'
      } border-t border-slate-200 dark:border-slate-700 flex-shrink-0`}>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className={`${
              widgetSize === 'half' ? 'text-xs' : 'text-sm'
            } font-bold text-emerald-600 dark:text-emerald-400`}>
              {budgets.filter(b => (b.spent / b.budget) * 100 < 80).length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              On Track
            </div>
          </div>
          <div className="text-center">
            <div className={`${
              widgetSize === 'half' ? 'text-xs' : 'text-sm'
            } font-bold text-red-600 dark:text-red-400`}>
              {budgets.filter(b => (b.spent / b.budget) * 100 >= 100).length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Over Budget
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
