'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinancialTotal {
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  currentMonthIncome: number;
  currentMonthSavings: number;
  totalExpenses: number;
  totalIncome: number;
  totalSavings: number;
}

interface UserWallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
}

interface FinancialSummaryProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function FinancialSummary({ widgetSize = 'square' }: FinancialSummaryProps) {
  const { state } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses, income, savings, wallets } = state.data;
  
  // Wallet loading state from context - only show loading during initial load
  const walletLoading = state.loading.wallets && state.loading.initial;


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
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    // Filter expenses for previous month
    const previousMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= previousMonthStart && expenseDate <= previousMonthEnd;
      })
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    // Filter income for current month
    const currentMonthIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd;
      })
      .reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);

    // Filter savings for current month
    const currentMonthSavings = savings
      .filter(saving => {
        const savingDate = new Date(saving.date);
        return savingDate >= currentMonthStart && savingDate <= currentMonthEnd;
      })
      .reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);
    const totalIncome = income.reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);
    const totalSavings = savings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);

    return {
      currentMonthExpenses,
      previousMonthExpenses,
      currentMonthIncome,
      currentMonthSavings,
      totalExpenses,
      totalIncome,
      totalSavings
    };
  }, [expenses, income, savings]);

  // Calculate wallet total balance
  const walletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

  // Calculate balances using wallet-first approach
  // Main/Spending Card = wallet balance (user's actual available money)
  const currentBalance = walletBalance;
  // Total assets = wallet balance + savings
  const totalAssets = currentBalance + financialData.totalSavings;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-transparent h-full flex flex-col group hover:shadow-2xl transition-all duration-300">
      {/* Card Content */}
      <div className="h-full flex flex-col">
        {/* Financial Summary Table */}
        <div className="flex-1 flex flex-col">
          {/* Assets Row - Takes up half the container, edge to edge */}
          <div className="h-1/2 bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-800 rounded-t-2xl p-4 border border-emerald-600/20 hover:from-emerald-700 hover:via-emerald-600 hover:to-emerald-800 transition-all duration-300 shadow-xl mb-3 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-green-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/10 to-green-400/10 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col h-full justify-center relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white tracking-wide uppercase">{t('totalAssets')}</span>
                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-lg animate-pulse"></div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight mb-2 drop-shadow-sm">
                {formatCurrency(totalAssets)}
              </div>
              <div className="text-xs text-emerald-100 font-medium opacity-90">
                {t('combinedAccounts')}
              </div>
            </div>
          </div>

          {/* Secondary Sections Container - Takes up remaining half */}
          <div className="flex-1 px-3 pb-3">
            <div className="h-full">
              {/* Savings Row */}
              <div className="flex flex-col justify-center p-2 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all duration-200 h-full">
                <div className="flex items-center mb-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{t('savings')}</span>
                </div>
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(financialData.totalSavings)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}