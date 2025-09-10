'use client';

import { useMemo } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface FinancialTotal {
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  currentMonthIncome: number;
  currentMonthSavings: number;
  totalExpenses: number;
  totalIncome: number;
  totalSavings: number;
}

interface BalanceOverviewProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BalanceOverview({ widgetSize = 'half' }: BalanceOverviewProps) {
  const { state } = useFinancialData();
  const { expenses, income, savings } = state.data;
  const investments: any[] = (state.data as any).investments || [];
  const loading = state.loading.initial && expenses.length === 0 && income.length === 0;

  // Calculate financial totals from context data
  const financialData: FinancialTotal & { totalInvestments: number } = useMemo(() => {
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

    // Filter savings for current month
    const currentMonthSavings = savings
      .filter(saving => {
        const savingDate = new Date(saving.date);
        return savingDate >= currentMonthStart && savingDate <= currentMonthEnd;
      })
      .reduce((sum, saving) => sum + parseFloat(saving.amount), 0);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncome = income.reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0);
    const totalSavings = savings.reduce((sum, saving) => sum + parseFloat(saving.amount), 0);
    const totalInvestments = (investments || []).reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);

    return {
      currentMonthExpenses,
      previousMonthExpenses,
      currentMonthIncome,
      currentMonthSavings,
      totalExpenses,
      totalIncome,
      totalSavings,
      totalInvestments
    };
  }, [expenses, income, savings, investments]);

  // Calculate balances with transfer-based approach
  // Main/Spending Card = income - expenses - savings transfers - investment transfers
  const currentBalance = financialData.totalIncome - financialData.totalExpenses - financialData.totalSavings - financialData.totalInvestments;
  // Total assets across all cards = spendable (main) + savings + investments
  const totalAssets = currentBalance + financialData.totalSavings + financialData.totalInvestments;
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
    <div className="relative h-full overflow-hidden rounded-2xl">
      {/* Credit Card Style Background */}
      <div className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-slate-200">
        {/* Card Content */}
        <div className="relative z-10 p-4 h-full flex flex-col rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
              <h2 className="text-slate-900 font-semibold text-lg">Rupi Card</h2>
            </div>
            <div className="text-slate-600 text-sm font-medium">
              {currentMonthName} {new Date().getFullYear()}
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="mb-6">
            <div className="text-slate-600 text-sm mb-2">Main Card Balance</div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(currentBalance)}
            </div>
            <div className="text-slate-500 text-xs">Available for Spending</div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Total Assets Card */}
            <div className="bg-slate-50/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
              <div className="text-slate-600 text-xs font-medium mb-1">Total Assets</div>
              <div className="text-sm font-bold text-slate-900 mb-1 truncate">
                {formatCurrency(totalAssets)}
              </div>
              <div className="text-emerald-600 text-xs">Net Worth</div>
            </div>

            {/* Savings Card */}
            <div className="bg-slate-50/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
              <div className="text-slate-600 text-xs font-medium mb-1">Savings Card</div>
              <div className="text-sm font-bold text-slate-900 mb-1 truncate">
                {formatCurrency(financialData.totalSavings)}
              </div>
              <div className="text-blue-600 text-xs">Transferred</div>
            </div>

            {/* Investments Card */}
            <div className="bg-slate-50/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
              <div className="text-slate-600 text-xs font-medium mb-1">Investment Card</div>
              <div className="text-sm font-bold text-slate-900 mb-1 truncate">
                {formatCurrency(financialData.totalInvestments || 0)}
              </div>
              <div className="text-purple-600 text-xs">Transferred</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
