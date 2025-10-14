'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { state } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses, income } = state.data;
  const loading = state.loading.initial && (expenses.length === 0 && income.length === 0);

  // Calculate financial data from context
  const financialData = useMemo(() => {
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

    // Filter expenses for current week and month
    const weeklyExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
      })
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    const monthlyExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    // Filter income for current week and month
    const weeklyIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= weekStart && incomeDate <= weekEnd;
      })
      .reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);

    const monthlyIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= monthStart && incomeDate <= monthEnd;
      })
      .reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);

    return {
      weeklyExpenses,
      monthlyExpenses,
      weeklyIncome,
      monthlyIncome
    };
  }, [expenses, income]);

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
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent h-full flex flex-col overflow-hidden">
        <div className={`${
          widgetSize === 'square' ? 'p-3' : 
          widgetSize === 'half' ? 'p-4' : 'p-6'
        } flex-shrink-0`}>
          <h2 className={`${
            widgetSize === 'square' ? 'text-sm' :
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } font-semibold text-neutral-900 dark:text-white`}>
            {t('incomeExpenseSummary')}
          </h2>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percentages for circular indicators
  // Both circles: show remaining amount after expenses (same calculation)
  const totalIncome = financialData.monthlyIncome;
  const totalExpenses = financialData.monthlyExpenses;
  
  // Both circles: fill percentage based on remaining after expenses
  const remainingAfterExpenses = Math.max(0, totalIncome - totalExpenses);
  const incomeProgress = totalIncome > 0 ? (remainingAfterExpenses / totalIncome) * 100 : 0;
  const expenseProgress = totalIncome > 0 ? (remainingAfterExpenses / totalIncome) * 100 : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-transparent h-full flex flex-col overflow-hidden group hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className={`flex items-center ${
        widgetSize === 'square' ? 'p-3' : 
        widgetSize === 'half' ? 'p-3' : 'p-4'
      } flex-shrink-0`}>
        <h2 className={`${
          widgetSize === 'square' ? 'text-xs' :
          widgetSize === 'half' ? 'text-xs' : 'text-sm'
        } font-bold text-neutral-900 dark:text-white`}>
          {t('expenseIncomes')}
        </h2>
      </div>

      <div className="flex-1 flex flex-col px-3 pb-2 pt-2 space-y-4">
        {/* Income Section */}
        <div className="flex items-center space-x-3">
          {/* Circular Progress for Income - Fills up */}
          <div className="relative flex-shrink-0">
            <svg className="w-12 h-12" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#e5e7eb"
                strokeWidth="2"
                fill="none"
                className="text-neutral-200"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 9} ${2 * Math.PI * 9}`}
                strokeDashoffset={`${2 * Math.PI * 9 * (1 - incomeProgress / 100)}`}
                transform="rotate(-90 12 12)"
                className="transition-all duration-300"
                style={{ strokeLinecap: 'round' }}
              />
            </svg>
          </div>
          
          {/* Income Details */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(financialData.monthlyIncome)}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('totalIncomesThisMonth')}
            </div>
          </div>
        </div>

        {/* Expense Section */}
        <div className="flex items-center space-x-3">
          {/* Circular Progress for Expenses - Grey progress on red background */}
          <div className="relative flex-shrink-0">
            <svg className="w-12 h-12" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#f97316"
                strokeWidth="2"
                fill="none"
                className="text-orange-500"
              />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="#e5e7eb"
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 9} ${2 * Math.PI * 9}`}
                  strokeDashoffset={`${2 * Math.PI * 9 * (1 - expenseProgress / 100)}`}
                  transform="rotate(-90 12 12)"
                  className="transition-all duration-300"
                  style={{ strokeLinecap: 'round' }}
                />
            </svg>
          </div>
          
          {/* Expense Details */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              -{formatCurrency(financialData.monthlyExpenses)}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('totalOutcomesThisMonth')}
            </div>
          </div>
        </div>

        {/* Percentage Summary */}
        <div className="text-center">
          <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 inline-block">
            {financialData.monthlyIncome > 0 
              ? (
                <>
                  <span className="font-bold text-red-700 dark:text-red-400">
                    {Math.round((financialData.monthlyExpenses / financialData.monthlyIncome) * 100)}%
                  </span>
                  <span>{t('ofIncomeUsed')}</span>
                </>
              )
              : t('noIncomeData')
            }
          </div>
        </div>
      </div>
    </div>
  );
}



