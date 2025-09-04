'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Car, Coffee, ShoppingBag, Utensils, Home, Calendar, RefreshCw, Zap, Plane, Heart, GamepadIcon, CreditCard, Users, DollarSign, TrendingUp, Briefcase, Gift } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  type: 'income' | 'expense';
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface Income {
  id: number;
  description: string;
  amount: number;
  source: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface RecentTransactionsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function RecentTransactions({ widgetSize = 'long' }: RecentTransactionsProps) {
  const { state, refreshAll } = useFinancialData();
  const { transactions } = state.data;
  const loading = state.loading.initial && transactions.length === 0;
  const [error, setError] = useState<string | null>(null);

  // Manual refresh function for the refresh button
  const handleRefresh = async () => {
    try {
      setError(null);
      await refreshAll();
    } catch (err) {
      console.error('Error refreshing transactions:', err);
      setError('Failed to refresh transactions');
    }
  };

  // Get icon and color for category
  const getCategoryInfo = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      const incomeCategories: Record<string, { icon: any; color: string }> = {
        'Salary': { icon: Briefcase, color: 'text-blue-600 dark:text-blue-400' },
        'Freelance': { icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400' },
        'Business': { icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
        'Investment': { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
        'Bonus': { icon: Gift, color: 'text-yellow-600 dark:text-yellow-400' },
        'Gift': { icon: Gift, color: 'text-pink-600 dark:text-pink-400' },
        'Others': { icon: DollarSign, color: 'text-gray-600 dark:text-gray-400' },
      };
      return incomeCategories[category] || { icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' };
    } else {
      const expenseCategories: Record<string, { icon: any; color: string }> = {
        'Housing & Utilities': { icon: Home, color: 'text-orange-600 dark:text-orange-400' },
        'Food & Groceries': { icon: Utensils, color: 'text-green-600 dark:text-green-400' },
        'Transportation': { icon: Car, color: 'text-blue-600 dark:text-blue-400' },
        'Health & Personal': { icon: Heart, color: 'text-red-600 dark:text-red-400' },
        'Entertainment & Shopping': { icon: ShoppingBag, color: 'text-purple-600 dark:text-purple-400' },
        'Debt & Savings': { icon: CreditCard, color: 'text-cyan-600 dark:text-cyan-400' },
        'Family & Others': { icon: Users, color: 'text-gray-600 dark:text-gray-400' },
        // Fallbacks for old categories
        'Transport': { icon: Car, color: 'text-blue-600 dark:text-blue-400' },
        'Food': { icon: Utensils, color: 'text-green-600 dark:text-green-400' },
        'Bills': { icon: Home, color: 'text-orange-600 dark:text-orange-400' },
        'Shopping': { icon: ShoppingBag, color: 'text-purple-600 dark:text-purple-400' },
        'Coffee': { icon: Coffee, color: 'text-amber-600 dark:text-amber-400' },
      };
      return expenseCategories[category] || { icon: Coffee, color: 'text-gray-600 dark:text-gray-400' };
    }
  };


  // Limit transactions based on widget size
  const getTransactionLimit = () => {
    switch (widgetSize) {
      case 'square': return 3;
      case 'half': return 4;
      case 'long': return 6;
      default: return 6;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const limitedTransactions = transactions.slice(0, getTransactionLimit());

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${widgetSize === 'square' ? 'text-base' : 'text-lg'} font-semibold text-slate-900 dark:text-white`}>
            Recent Transactions
          </h2>
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: getTransactionLimit() }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className={`${
          widgetSize === 'square' ? 'text-base' : 'text-lg'
        } font-semibold text-slate-900 dark:text-white`}>
          Recent Transactions
        </h2>
        <button 
          onClick={handleRefresh}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center space-x-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${
        widgetSize === 'square' ? 'space-y-2' : 'space-y-3'
      }`}>
        {limitedTransactions.length === 0 && !loading ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No transactions yet. Start by chatting with the AI assistant!
            </p>
          </div>
        ) : (
          limitedTransactions.map((transaction) => {
          const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
          const IconComponent = categoryInfo.icon;
          const isIncome = transaction.type === 'income';
          
          return (
            <div
              key={transaction.id}
              className={`flex items-center justify-between ${
                widgetSize === 'square' ? 'p-2' : 'p-3'
              } rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className={`${
                  widgetSize === 'square' ? 'p-1.5' : 'p-2'
                } rounded-lg mr-3 flex-shrink-0 ${
                  isIncome 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  <IconComponent className={`${
                    widgetSize === 'square' ? 'w-4 h-4' : 'w-5 h-5'
                  } ${categoryInfo.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`${
                    widgetSize === 'square' ? 'text-sm' : 'text-base'
                  } font-medium text-slate-900 dark:text-white truncate`}>
                    {transaction.description}
                  </div>
                  {widgetSize !== 'square' && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                      <span className="truncate">{transaction.category}</span>
                      <span className="mx-1">•</span>
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="flex-shrink-0">{formatDate(transaction.date)}</span>
                      <span className="mx-1">•</span>
                      <span className="flex-shrink-0">{formatTime(transaction.date)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-2">
                <div className={`${
                  widgetSize === 'square' ? 'text-sm' : 'text-base'
                } font-semibold ${
                  isIncome 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
                {widgetSize === 'square' && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(transaction.date)} • {formatTime(transaction.date)}
                  </div>
                )}
              </div>
            </div>
          );
        }))}
      </div>

      {/* Quick Actions - Conditional based on widget size */}
      {widgetSize !== 'square' && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className={`flex gap-3 ${
            widgetSize === 'half' ? 'flex-col' : 'flex-row'
          }`}>
            <button className={`${
              widgetSize === 'half' ? 'w-full' : 'flex-1'
            } bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm`}>
              - Add Expense
            </button>
            <button className={`${
              widgetSize === 'half' ? 'w-full' : 'flex-1'
            } bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm`}>
              + Add Income
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
