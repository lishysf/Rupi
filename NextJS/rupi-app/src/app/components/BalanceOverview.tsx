'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceOverviewProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BalanceOverview({ widgetSize = 'half' }: BalanceOverviewProps) {
  // Mock data - in real app this would come from your state/API
  const currentBalance = 5750000; // Rp 5,750,000
  const monthProgress = 68; // 68% through the month
  const monthChange = 150000; // +Rp 150,000 from last month
  const isPositiveChange = monthChange > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          {Math.ceil(31 * (1 - monthProgress / 100))} days remaining in January
        </div>
      </div>
    </div>
  );
}
