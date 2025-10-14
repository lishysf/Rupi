'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, CreditCard, Settings } from 'lucide-react';
import WalletModal from './WalletModal';
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

interface BalanceOverviewProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BalanceOverview({ widgetSize = 'half' }: BalanceOverviewProps) {
  const { state } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses, income, savings, wallets } = state.data;
  const investments: unknown[] = (state.data as Record<string, unknown>).investments || [];
  const loading = state.loading.initial && expenses.length === 0 && income.length === 0;
  
  // Wallet state
  const [showWalletModal, setShowWalletModal] = useState(false);

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

  // Wallet loading state from context - only show loading during initial load
  const walletLoading = state.loading.wallets && state.loading.initial;

  // Calculate wallet total balance
  const walletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  // Calculate balances
  // Main/Spending Card = wallet balance (user's actual available money)
  const currentBalance = walletBalance;
  // Total assets = wallet balance + savings + current investment portfolio value
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
      <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-800 shadow-xl border border-emerald-600/20">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-400/30 rounded-full mr-3 animate-pulse"></div>
              <div className="w-24 h-5 bg-emerald-400/30 rounded animate-pulse"></div>
            </div>
            <div className="w-20 h-6 bg-emerald-400/30 rounded-full animate-pulse"></div>
          </div>
          <div className="mb-8">
            <div className="w-32 h-4 bg-emerald-400/30 rounded animate-pulse mb-2"></div>
            <div className="w-48 h-10 bg-emerald-400/30 rounded animate-pulse mb-2"></div>
            <div className="w-40 h-3 bg-emerald-400/30 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="w-20 h-16 bg-emerald-400/30 rounded-lg animate-pulse"></div>
            <div className="w-20 h-16 bg-emerald-400/30 rounded-lg animate-pulse"></div>
            <div className="w-20 h-16 bg-emerald-400/30 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-3xl group hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
      {/* Dark Green Card Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-800 rounded-3xl shadow-2xl border border-emerald-600/20">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.1) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
            animation: 'float 20s ease-in-out infinite'
          }}></div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-green-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/10 to-green-400/10 rounded-full blur-2xl"></div>
        
        {/* Card Content */}
        <div className="relative z-10 p-4 h-full flex flex-col">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-lg animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="ml-3">
                <h2 className="text-white font-bold text-base tracking-tight">{t('myWallets')}</h2>
                <p className="text-emerald-200 text-xs">
                  {wallets.length > 0 ? `${wallets.length} ${t('walletsCount')}` : t('noWallets')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWalletModal(true)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-600/20 rounded-lg transition-colors"
                title={t('manageWallets')}
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="text-emerald-200 text-xs font-semibold bg-emerald-600/20 px-2 py-1 rounded-full shadow-sm border border-emerald-500/30">
                {currentMonthName} {new Date().getFullYear()}
              </div>
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-emerald-200 text-sm font-medium">{t('totalWalletBalance')}</div>
                <div className="flex items-center text-xs text-emerald-300">
                  <Wallet className="w-3 h-3 mr-1" />
                  {t('available')}
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight mb-3">
                {walletLoading ? (
                  <div className="w-48 h-8 bg-emerald-400/30 rounded animate-pulse"></div>
                ) : (
                  formatCurrency(currentBalance)
                )}
              </div>
              <div className="flex items-center text-emerald-200 text-sm">
                <Wallet className="w-4 h-4 mr-2" />
                {wallets.length > 0 ? `${t('acrossWallets')} ${wallets.length} ${t('walletsCount')}` : t('addWalletsTrack')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
      `}</style>
      
      {/* Wallet Management Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletUpdate={() => {
          // Wallet updates are handled by the context
        }}
      />
    </div>
  );
}
