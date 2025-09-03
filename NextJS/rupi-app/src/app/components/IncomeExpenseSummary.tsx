'use client';

import { ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';

interface IncomeExpenseSummaryProps {
  widgetSize?: 'square' | 'half' | 'long';
}

export default function IncomeExpenseSummary({ widgetSize = 'square' }: IncomeExpenseSummaryProps) {
  // Mock data
  const weeklyIncome = 2500000; // Rp 2,500,000
  const weeklyExpenses = 1750000; // Rp 1,750,000
  const monthlyIncome = 10000000; // Rp 10,000,000
  const monthlyExpenses = 6800000; // Rp 6,800,000
  const netSavings = monthlyIncome - monthlyExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden">
      <div className={`${
        widgetSize === 'square' ? 'p-3' : 
        widgetSize === 'half' ? 'p-4' : 'p-6'
      } flex-shrink-0`}>
        <h2 className={`${
          widgetSize === 'square' ? 'text-sm' :
          widgetSize === 'half' ? 'text-base' : 'text-lg'
        } font-semibold text-slate-900 dark:text-white`}>
          Income & Expense Summary
        </h2>
      </div>

      <div className={`flex-1 flex flex-col overflow-y-auto ${
        widgetSize === 'square' ? 'px-3 pb-3 space-y-2' :
        widgetSize === 'half' ? 'px-4 pb-4 space-y-3' : 'px-6 pb-6 space-y-4'
      }`}>
        {/* Weekly Stats */}
        <div className="flex-1 min-h-0">
          <div className={`${
            widgetSize === 'square' ? 'text-xs' :
            widgetSize === 'half' ? 'text-sm' : 'text-sm'
          } font-medium text-slate-600 dark:text-slate-300 mb-1`}>
            This Week
          </div>
          <div className={`${widgetSize === 'square' ? 'space-y-1' : 'space-y-2'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <ArrowUpCircle className={`${
                  widgetSize === 'square' ? 'w-3 h-3' : 'w-4 h-4'
                } text-emerald-500 mr-1 flex-shrink-0`} />
                <span className={`${
                  widgetSize === 'square' ? 'text-xs' : 'text-xs'
                } text-slate-600 dark:text-slate-300`}>Income</span>
              </div>
              <span className={`${
                widgetSize === 'square' ? 'text-xs' : 'text-sm'
              } font-semibold text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0`}>
                {widgetSize === 'square' ? 
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(weeklyIncome) :
                  formatCurrency(weeklyIncome)
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <ArrowDownCircle className={`${
                  widgetSize === 'square' ? 'w-3 h-3' : 'w-4 h-4'
                } text-red-500 mr-1 flex-shrink-0`} />
                <span className={`${
                  widgetSize === 'square' ? 'text-xs' : 'text-xs'
                } text-slate-600 dark:text-slate-300`}>Expenses</span>
              </div>
              <span className={`${
                widgetSize === 'square' ? 'text-xs' : 'text-sm'
              } font-semibold text-red-600 dark:text-red-400 ml-2 flex-shrink-0`}>
                {widgetSize === 'square' ? 
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(weeklyExpenses) :
                  formatCurrency(weeklyExpenses)
                }
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="flex-1 min-h-0">
          <div className={`${
            widgetSize === 'square' ? 'text-xs' :
            widgetSize === 'half' ? 'text-sm' : 'text-sm'
          } font-medium text-slate-600 dark:text-slate-300 mb-1`}>
            This Month
          </div>
          <div className={`${widgetSize === 'square' ? 'space-y-1' : 'space-y-2'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <ArrowUpCircle className={`${
                  widgetSize === 'square' ? 'w-3 h-3' : 'w-4 h-4'
                } text-emerald-500 mr-1 flex-shrink-0`} />
                <span className={`${
                  widgetSize === 'square' ? 'text-xs' : 'text-xs'
                } text-slate-600 dark:text-slate-300`}>Income</span>
              </div>
              <span className={`${
                widgetSize === 'square' ? 'text-xs' : 'text-sm'
              } font-semibold text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0`}>
                {widgetSize === 'square' ? 
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(monthlyIncome) :
                  formatCurrency(monthlyIncome)
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <ArrowDownCircle className={`${
                  widgetSize === 'square' ? 'w-3 h-3' : 'w-4 h-4'
                } text-red-500 mr-1 flex-shrink-0`} />
                <span className={`${
                  widgetSize === 'square' ? 'text-xs' : 'text-xs'
                } text-slate-600 dark:text-slate-300`}>Expenses</span>
              </div>
              <span className={`${
                widgetSize === 'square' ? 'text-xs' : 'text-sm'
              } font-semibold text-red-600 dark:text-red-400 ml-2 flex-shrink-0`}>
                {widgetSize === 'square' ? 
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(monthlyExpenses) :
                  formatCurrency(monthlyExpenses)
                }
              </span>
            </div>
          </div>
        </div>

        {/* Net Savings */}
        <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-xl ${
          widgetSize === 'square' ? 'p-2 flex-shrink-0' : 'p-3 flex-shrink-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <PiggyBank className={`${
                widgetSize === 'square' ? 'w-3 h-3' : 'w-4 h-4'
              } text-emerald-600 dark:text-emerald-400 mr-1 flex-shrink-0`} />
              <span className={`${
                widgetSize === 'square' ? 'text-xs' : 'text-sm'
              } font-medium text-slate-700 dark:text-slate-200`}>
                Net Savings
              </span>
            </div>
            <span className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-base'
            } font-bold text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(netSavings) :
                formatCurrency(netSavings)
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
