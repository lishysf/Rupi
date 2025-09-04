'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, PiggyBank } from 'lucide-react';

interface FinancialData {
  weeklyExpenses: number;
  monthlyExpenses: number;
  weeklyIncome: number;
  monthlyIncome: number;
}

interface IncomeExpenseSummaryProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function IncomeExpenseSummary({ widgetSize = 'square' }: IncomeExpenseSummaryProps) {
  const [financialData, setFinancialData] = useState<FinancialData>({
    weeklyExpenses: 0,
    monthlyExpenses: 0,
    weeklyIncome: 0,
    monthlyIncome: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch financial data from database
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      
      // Get this week's data (Monday to Sunday)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);
      
      // Get this month's data
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [weekExpenseResponse, monthExpenseResponse, weekIncomeResponse, monthIncomeResponse] = await Promise.all([
        fetch(`/api/expenses?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`),
        fetch(`/api/expenses?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`),
        fetch(`/api/income?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`),
        fetch(`/api/income?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`)
      ]);

      if (!weekExpenseResponse.ok || !monthExpenseResponse.ok || !weekIncomeResponse.ok || !monthIncomeResponse.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const [weekExpenseData, monthExpenseData, weekIncomeData, monthIncomeData] = await Promise.all([
        weekExpenseResponse.json(),
        monthExpenseResponse.json(),
        weekIncomeResponse.json(),
        monthIncomeResponse.json()
      ]);

      if (weekExpenseData.success && monthExpenseData.success && weekIncomeData.success && monthIncomeData.success) {
        const weeklyExpenses = weekExpenseData.data.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
        const monthlyExpenses = monthExpenseData.data.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
        const weeklyIncome = weekIncomeData.data.reduce((sum: number, income: any) => sum + parseFloat(income.amount), 0);
        const monthlyIncome = monthIncomeData.data.reduce((sum: number, income: any) => sum + parseFloat(income.amount), 0);

        setFinancialData({
          weeklyExpenses,
          monthlyExpenses,
          weeklyIncome,
          monthlyIncome
        });
      } else {
        throw new Error('Failed to load financial data');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load data');
      // Keep default values if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Calculate net savings from real data
  const netSavings = financialData.monthlyIncome - financialData.monthlyExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
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
        <div className="flex-1 p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(financialData.weeklyIncome) :
                  formatCurrency(financialData.weeklyIncome)
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
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(financialData.weeklyExpenses) :
                  formatCurrency(financialData.weeklyExpenses)
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
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(financialData.monthlyIncome) :
                  formatCurrency(financialData.monthlyIncome)
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
                  new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(financialData.monthlyExpenses) :
                  formatCurrency(financialData.monthlyExpenses)
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
