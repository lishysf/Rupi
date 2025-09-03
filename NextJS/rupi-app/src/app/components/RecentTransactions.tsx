'use client';

import { ArrowUpRight, ArrowDownLeft, Car, Coffee, ShoppingBag, Utensils, Home, Calendar } from 'lucide-react';

interface RecentTransactionsProps {
  widgetSize?: 'square' | 'half' | 'long';
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Recent Transactions
        </h2>
        <button className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transactions.map((transaction) => {
          const IconComponent = transaction.icon;
          const isIncome = transaction.type === 'income';
          
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${
                  isIncome 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    isIncome 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-600 dark:text-slate-300'
                  }`} />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {transaction.description}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                    <span>{transaction.category}</span>
                    <span className="mx-1">•</span>
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-semibold ${
                  isIncome 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-3">
          <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            + Add Expense
          </button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            + Add Income
          </button>
        </div>
      </div>
    </div>
  );
}
