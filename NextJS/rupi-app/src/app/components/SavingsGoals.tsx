'use client';

import { Target, Laptop, Car, Home, Plane } from 'lucide-react';

interface SavingsGoalsProps {
  widgetSize?: 'square' | 'half' | 'long';
}

export default function SavingsGoals({ widgetSize = 'square' }: SavingsGoalsProps) {
  // Mock savings goals data
  const goals = [
    {
      id: 1,
      name: 'Laptop Baru',
      target: 15000000,
      current: 6000000,
      icon: Laptop,
      color: 'blue',
      deadline: '2024-06-01',
    },
    {
      id: 2,
      name: 'Motor Honda PCX',
      target: 35000000,
      current: 12500000,
      icon: Car,
      color: 'emerald',
      deadline: '2024-12-01',
    },
    {
      id: 3,
      name: 'Liburan Bali',
      target: 8000000,
      current: 5200000,
      icon: Plane,
      color: 'purple',
      deadline: '2024-08-01',
    },
    {
      id: 4,
      name: 'Emergency Fund',
      target: 50000000,
      current: 18750000,
      icon: Home,
      color: 'amber',
      deadline: '2025-12-01',
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
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        progress: 'bg-blue-500',
        icon: 'bg-blue-100 dark:bg-blue-900/30',
      },
      emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-600 dark:text-emerald-400',
        progress: 'bg-emerald-500',
        icon: 'bg-emerald-100 dark:bg-emerald-900/30',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
        progress: 'bg-purple-500',
        icon: 'bg-purple-100 dark:bg-purple-900/30',
      },
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-600 dark:text-amber-400',
        progress: 'bg-amber-500',
        icon: 'bg-amber-100 dark:bg-amber-900/30',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Savings Goals
          </h2>
        </div>
        <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
          + Add
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {goals.slice(0, 2).map((goal) => {
          const percentage = (goal.current / goal.target) * 100;
          const remaining = goal.target - goal.current;
          const IconComponent = goal.icon;
          const colors = getColorClasses(goal.color);
          
          return (
            <div
              key={goal.id}
              className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className={`p-1.5 rounded-md mr-2 ${colors.icon}`}>
                    <IconComponent className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                      {goal.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(goal.deadline)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${colors.text}`}>
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300">
                    {formatCurrency(goal.current)}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {formatCurrency(goal.target)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${colors.progress}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(remaining)} left
                </span>
                <button className={`text-xs px-2 py-1 rounded ${colors.text} hover:opacity-80 transition-opacity font-medium`}>
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(goals.reduce((sum, goal) => sum + goal.current, 0))}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total Saved
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {((goals.reduce((sum, goal) => sum + (goal.current / goal.target), 0) / goals.length) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Avg Progress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
