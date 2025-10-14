'use client';

import { Target, Laptop, Car, Home, Plane, Plus, Trash2, Wallet, ExternalLink } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import SavingsGoalsPopup from './SavingsGoalsPopup';

interface SavingsGoalsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

interface SavingsGoal {
  id: number;
  goal_name: string;
  target_amount: number;
  allocated_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string | null;
  color: string | null;
}

export default function SavingsGoals({ widgetSize = 'medium' }: SavingsGoalsProps) {
  const { state, fetchSavings } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { savings } = state.data;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  // Calculate total saved money from savings transactions
  const totalSaved = savings.reduce((sum: number, saving: {amount: number | string}) => {
    const amount = parseFloat(saving.amount.toString()) || 0;
    return sum + amount;
  }, 0);

  // Calculate total allocated amount across all goals
  const totalAllocated = goals.reduce((sum: number, goal: {allocated_amount: number | string}) => {
    const allocatedAmount = parseFloat(goal.allocated_amount.toString()) || 0;
    return sum + allocatedAmount;
  }, 0);

  // Calculate allocable amount (total saved - total allocated)
  const allocableAmount = Math.max(0, totalSaved - totalAllocated);


  // Fetch savings goals from API
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/savings-goals');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGoals(data.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching savings goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  // Refresh goals when savings data changes
  useEffect(() => {
    if (savings.length > 0) {
      const refreshGoals = async () => {
        try {
          const response = await fetch('/api/savings-goals');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setGoals(data.data || []);
            }
          }
        } catch (error) {
          console.error('Error refreshing savings goals:', error);
        }
      };
      refreshGoals();
    }
  }, [savings.length]);

  // Listen for savings goals updates from popup
  useEffect(() => {
    const handleGoalsUpdate = () => {
      const refreshGoals = async () => {
        try {
          const response = await fetch('/api/savings-goals');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setGoals(data.data || []);
            }
          }
        } catch (error) {
          console.error('Error refreshing savings goals:', error);
        }
      };
      refreshGoals();
    };

    // Listen for custom events from popup
    window.addEventListener('savingsGoalsUpdated', handleGoalsUpdate);
    window.addEventListener('savingsGoalCreated', handleGoalsUpdate);
    window.addEventListener('savingsGoalAllocated', handleGoalsUpdate);

    return () => {
      window.removeEventListener('savingsGoalsUpdated', handleGoalsUpdate);
      window.removeEventListener('savingsGoalCreated', handleGoalsUpdate);
      window.removeEventListener('savingsGoalAllocated', handleGoalsUpdate);
    };
  }, []);

  // Get icon component based on icon name
  const getIconComponent = (iconName: string | null) => {
    const icons: Record<string, React.ComponentType<{className?: string}>> = {
      'laptop': Laptop,
      'car': Car,
      'home': Home,
      'plane': Plane,
    };
    return icons[iconName || ''] || Target;
  };

  const formatCurrency = (amount: number) => {
    const validAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(validAmount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Calculate monthly savings needed and estimated completion
  const calculateMonthlySavings = (goal: SavingsGoal) => {
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    if (remaining <= 0) return { monthlyAmount: 0, monthsToComplete: 0, estimatedDate: null };

    if (goal.target_date) {
      // If target_date is set, calculate monthly amount needed
      const targetDate = new Date(goal.target_date);
      const now = new Date();
      const monthsRemaining = Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()));
      const monthlyAmount = Math.ceil(remaining / monthsRemaining);
      return { monthlyAmount, monthsToComplete: monthsRemaining, estimatedDate: goal.target_date };
    } else {
      // If no target_date, don't show monthly amount - just show remaining amount
      return { monthlyAmount: 0, monthsToComplete: 0, estimatedDate: null };
    }
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {t('savingsGoals')}
          </h2>
          <div className="w-4 h-4 animate-spin border-2 border-emerald-400 border-t-transparent rounded-full"></div>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="p-3 rounded-lg border bg-neutral-100 dark:bg-neutral-700">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-neutral-200 dark:bg-neutral-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Savings Goals
          </h2>
        </div>
        <button 
          onClick={() => setShowPopup(true)}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {t('manageGoals')}
        </button>
      </div>

      {/* Total Saved Money Display */}
      <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('totalMoneySaved')}</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(totalSaved)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {goals.length > 0 ? `${goals.length} ${t('goalsSet')}` : t('noSavingsGoalsYet')}
            </div>
            {goals.length > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatCurrency(allocableAmount)} {t('availableToAllocate')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
              {t('noSavingsGoalsYet')}
            </p>
            <button
              onClick={() => setShowPopup(true)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              {t('createFirstGoal')}
            </button>
          </div>
        ) : (
          goals.slice(0, 2).map((goal) => {
            const currentAmount = Number(goal.current_amount) || 0;
            const allocatedAmount = Number(goal.allocated_amount) || 0;
            const targetAmount = Number(goal.target_amount) || 0;
            const totalProgress = currentAmount + allocatedAmount;
            const percentage = targetAmount > 0 ? Math.min(100, (totalProgress / targetAmount) * 100) : 0;
            const IconComponent = getIconComponent(goal.icon);
            const colors = getColorClasses(goal.color || 'blue');
            
            return (
              <div
                key={goal.id}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setShowPopup(true)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`p-1.5 rounded-md mr-2 ${colors.icon}`}>
                      <IconComponent className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                        {goal.goal_name}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {goal.target_date ? `${t('targetLabel')}: ${formatDate(goal.target_date)}` : t('noDeadline')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${colors.text}`}>
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {formatCurrency(Number(totalProgress))}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {formatCurrency(Number(goal.target_amount))}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${colors.progress}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

              </div>
            );
          })
        )}
        
        {goals.length > 2 && (
          <div className="text-center py-2">
            <button
              onClick={() => setShowPopup(true)}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {t('viewAllGoals')}
            </button>
          </div>
        )}
      </div>


      {/* Savings Goals Popup */}
      <SavingsGoalsPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
      />
    </div>
  );
}
