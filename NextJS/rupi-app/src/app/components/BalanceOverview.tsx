'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface FinancialTotal {
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  currentMonthIncome: number;
  totalExpenses: number;
  totalIncome: number;
}

interface BalanceOverviewProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BalanceOverview({ widgetSize = 'half' }: BalanceOverviewProps) {
  const { state } = useFinancialData();
  const { expenses, income } = state.data;
  const loading = state.loading.initial && expenses.length === 0 && income.length === 0;

  // Calculate financial totals from context data
  const financialData: FinancialTotal = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Filter expenses for current month
    const currentMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Filter expenses for previous month
    const previousMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= previousMonthStart && expenseDate <= previousMonthEnd;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Filter income for current month
    const currentMonthIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd;
      })
      .reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncome = income.reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0);

    return {
      currentMonthExpenses,
      previousMonthExpenses,
      currentMonthIncome,
      totalExpenses,
      totalIncome
    };
  }, [expenses, income]);

  // Calculate balance using real income and expense data
  const currentBalance = financialData.totalIncome - financialData.totalExpenses;
  const monthChange = financialData.previousMonthExpenses - financialData.currentMonthExpenses; // Positive if spending less
  const isPositiveChange = monthChange > 0;
  
  // Calculate month progress (current day / total days in month)
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.min(100, Math.max(0, Math.round((currentDay / daysInMonth) * 100)));
  const remainingDays = Math.max(0, daysInMonth - currentDay);
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' });
  
  // Debug logging (can be removed later)
  console.log('Month Progress Debug:', {
    currentDay,
    daysInMonth,
    monthProgress,
    remainingDays,
    currentMonthName,
    calculation: `${currentDay}/${daysInMonth} * 100 = ${(currentDay / daysInMonth) * 100}`
  });

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Balance Overview
          </h2>
          <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        <div className="mb-6">
          <div className="w-48 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        <div className="flex-1">
          <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Balance Overview
        </h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Current Month
        </div>
      </div>

      {/* Main Balance */}
      <div className="mb-6">
        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {formatCurrency(currentBalance)}
        </div>
        <div className={`flex items-center text-sm ${
          isPositiveChange 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositiveChange ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          {isPositiveChange ? '+' : ''}{formatCurrency(monthChange)} from last month
        </div>
      </div>

      {/* Month Progress */}
      <div className="flex-1 flex flex-col justify-end space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-300">Month Progress</span>
          <span className="font-medium text-slate-900 dark:text-white">{monthProgress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${monthProgress}%` }}
          ></div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {remainingDays} days remaining in {currentMonthName}
        </div>
      </div>
    </div>
  );
}
