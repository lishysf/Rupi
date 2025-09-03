'use client';

import { ArrowUpRight, ArrowDownLeft, Car, Coffee, ShoppingBag, Utensils, Home, Calendar } from 'lucide-react';

interface RecentTransactionsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function RecentTransactions({ widgetSize = 'long' }: RecentTransactionsProps) {
  // Mock transaction data
  const transactions = [
    {
      id: 1,
      type: 'expense',
      category: 'Transport',
      description: 'Bensin Shell',
      amount: 50000,
      date: '2024-01-28',
      icon: Car,
    },
    {
      id: 2,
      type: 'income',
      category: 'Salary',
      description: 'Gaji Bulanan',
      amount: 8000000,
      date: '2024-01-28',
      icon: ArrowUpRight,
    },
    {
      id: 3,
      type: 'expense',
      category: 'Food',
      description: 'Lunch di Warteg',
      amount: 25000,
      date: '2024-01-27',
      icon: Utensils,
    },
    {
      id: 4,
      type: 'expense',
      category: 'Coffee',
      description: 'Starbucks Americano',
      amount: 45000,
      date: '2024-01-27',
      icon: Coffee,
    },
    {
      id: 5,
      type: 'expense',
      category: 'Shopping',
      description: 'Kemeja Uniqlo',
      amount: 299000,
      date: '2024-01-26',
      icon: ShoppingBag,
    },
    {
      id: 6,
      type: 'expense',
      category: 'Bills',
      description: 'Listrik PLN',
      amount: 185000,
      date: '2024-01-25',
      icon: Home,
    },
    {
      id: 7,
      type: 'expense',
      category: 'Transport',
      description: 'Grab ke Kantor',
      amount: 28000,
      date: '2024-01-25',
      icon: Car,
    },
    {
      id: 8,
      type: 'expense',
      category: 'Food',
      description: 'Dinner Sushi',
      amount: 125000,
      date: '2024-01-24',
      icon: Utensils,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
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

  const limitedTransactions = transactions.slice(0, getTransactionLimit());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className={`${
          widgetSize === 'square' ? 'text-base' : 'text-lg'
        } font-semibold text-slate-900 dark:text-white`}>
          Recent Transactions
        </h2>
        <button className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
          View All
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto ${
        widgetSize === 'square' ? 'space-y-2' : 'space-y-3'
      }`}>
        {limitedTransactions.map((transaction) => {
          const IconComponent = transaction.icon;
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
                  } ${
                    isIncome 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-600 dark:text-slate-300'
                  }`} />
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
                    {formatDate(transaction.date)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Conditional based on widget size */}
      {widgetSize !== 'square' && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className={`flex gap-3 ${
            widgetSize === 'half' ? 'flex-col' : 'flex-row'
          }`}>
            <button className={`${
              widgetSize === 'half' ? 'w-full' : 'flex-1'
            } bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm`}>
              + Add Expense
            </button>
            <button className={`${
              widgetSize === 'half' ? 'w-full' : 'flex-1'
            } bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm`}>
              + Add Income
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
