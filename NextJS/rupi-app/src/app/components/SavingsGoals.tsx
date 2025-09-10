'use client';

import { Target, Laptop, Car, Home, Plane, Plus } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useState, useEffect } from 'react';
import SavingsGoalModal from './SavingsGoalModal';

interface SavingsGoalsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
}

export default function SavingsGoals({ widgetSize = 'medium' }: SavingsGoalsProps) {
  const { state, fetchSavings } = useFinancialData();
  const { savings } = state.data;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to load savings goals');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  // Handle creating new savings goal
  const handleCreateGoal = async (goalData: any) => {
    try {
      setError(null);
      const response = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh goals list
          const refreshResponse = await fetch('/api/savings-goals');
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
              setGoals(refreshData.data || []);
            }
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error creating savings goal:', error);
      setError('Failed to create savings goal');
      return false;
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
  };

  // Get icon component based on icon name
  const getIconComponent = (iconName: string | null) => {
    const icons: Record<string, any> = {
      'laptop': Laptop,
      'car': Car,
      'home': Home,
      'plane': Plane,
    };
    return icons[iconName || ''] || Target;
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
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Calculate monthly savings needed and estimated completion
  const calculateMonthlySavings = (goal: SavingsGoal) => {
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return { monthlyAmount: 0, monthsToComplete: 0, estimatedDate: null };

    if (goal.deadline) {
      // If deadline is set, calculate monthly amount needed
      const deadlineDate = new Date(goal.deadline);
      const now = new Date();
      const monthsRemaining = Math.max(1, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()));
      const monthlyAmount = Math.ceil(remaining / monthsRemaining);
      return { monthlyAmount, monthsToComplete: monthsRemaining, estimatedDate: goal.deadline };
    } else {
      // If no deadline, assume 1 million per month and calculate estimated completion
      const monthlyAmount = 1000000; // Default monthly savings
      const monthsToComplete = Math.ceil(remaining / monthlyAmount);
      const estimatedDate = new Date();
      estimatedDate.setMonth(estimatedDate.getMonth() + monthsToComplete);
      return { monthlyAmount, monthsToComplete, estimatedDate: estimatedDate.toISOString().split('T')[0] };
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Savings Goals
          </h2>
          <div className="w-4 h-4 animate-spin border-2 border-slate-400 border-t-transparent rounded-full"></div>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="p-3 rounded-lg border bg-slate-100 dark:bg-slate-700">
                <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
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
        <div className="flex items-center">
          <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Savings Goals
          </h2>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          <Plus className="w-3 h-3 inline mr-1" />
          Add
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No savings goals yet. Create your first goal!
            </p>
          </div>
        ) : (
          goals.slice(0, 2).map((goal) => {
            const percentage = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;
            const IconComponent = getIconComponent(goal.icon);
            const colors = getColorClasses(goal.color || 'blue');
            const { monthlyAmount, monthsToComplete, estimatedDate } = calculateMonthlySavings(goal);
            
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
                        {goal.deadline ? formatDate(goal.deadline) : `Est. ${estimatedDate ? formatDate(estimatedDate) : 'N/A'}`}
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
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${colors.progress}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(remaining)} left
                    </span>
                    <button 
                      onClick={() => setShowModal(true)}
                      className={`text-xs px-2 py-1 rounded ${colors.text} hover:opacity-80 transition-opacity font-medium`}
                    >
                      Add
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    💰 {formatCurrency(monthlyAmount)}/month • {monthsToComplete} months left
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(goals.reduce((sum, goal) => sum + goal.current_amount, 0))}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total Saved
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {goals.length > 0 ? ((goals.reduce((sum, goal) => sum + (goal.current_amount / goal.target_amount), 0) / goals.length) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Avg Progress
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Savings Goal Modal */}
      <SavingsGoalModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleCreateGoal}
      />
    </div>
  );
}
