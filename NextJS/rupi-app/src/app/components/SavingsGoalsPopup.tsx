'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, Laptop, Car, Home, Plane, Plus, Trash2, X, Wallet, Edit3 } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import SavingsGoalModal from './SavingsGoalModal';
import WalletSavingsAllocation from './WalletSavingsAllocation';

interface SavingsGoalsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SavingsGoal {
  id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  icon: string | null;
  color: string | null;
}

export default function SavingsGoalsPopup({ isOpen, onClose }: SavingsGoalsPopupProps) {
  const { state, fetchSavings } = useFinancialData();
  const { savings } = state.data;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWalletAllocation, setShowWalletAllocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total saved money from savings transactions
  const totalSaved = savings.reduce((sum: number, saving: any) => {
    const amount = parseFloat(saving.amount) || 0;
    return sum + amount;
  }, 0);

  // Load goals when popup opens
  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
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
          await loadGoals();
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

  // Handle delete goal
  const handleDeleteGoal = async (goalId: number, goalName: string) => {
    if (!confirm(`Are you sure you want to delete the goal "${goalName}"? This will also delete all associated savings records.`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadGoals();
      } else {
        const errorData = await response.json();
        setError(`Failed to delete goal: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal');
    }
  };

  // Handle wallet-based allocation save
  const handleWalletAllocationSave = async (allocations: Array<{goalId: number, walletId: number, amount: number}>) => {
    try {
      setError(null);
      
      const response = await fetch('/api/savings-goals/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allocations }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh goals and savings data
        await fetchSavings();
        await loadGoals();
        return true;
      } else {
        setError(data.error || 'Failed to save wallet allocations');
        return false;
      }
    } catch (error) {
      console.error('Error saving wallet allocations:', error);
      setError('Failed to save wallet allocations');
      return false;
    }
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

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Savings Goals
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Manage your savings goals and allocate funds
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
            {/* Total Saved Money Display */}
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Total Money Saved</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(totalSaved)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400">
                    {goals.length > 0 ? `${goals.length} goal${goals.length !== 1 ? 's' : ''} set` : 'No goals yet'}
                  </div>
                  {totalSaved > 0 && goals.length > 0 && (
                    <button
                      onClick={() => setShowWalletAllocation(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Allocate Savings
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Goal
              </button>
            </div>

            {/* Goals List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No savings goals yet</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Create your first savings goal to start tracking your progress
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal) => {
                  const currentAmount = goal.current_amount || 0;
                  const targetAmount = goal.target_amount || 0;
                  const percentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
                  const remaining = Math.max(0, targetAmount - currentAmount);
                  const IconComponent = getIconComponent(goal.icon);
                  const colors = getColorClasses(goal.color || 'blue');
                  
                  return (
                    <div
                      key={goal.id}
                      className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colors.icon}`}>
                            <IconComponent className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {goal.goal_name}
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No deadline set'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id, goal.goal_name)}
                          className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete goal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-neutral-600 dark:text-neutral-300">
                            {formatCurrency(currentAmount)}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-300">
                            {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${colors.progress}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-sm font-semibold ${colors.text}`}>
                            {percentage.toFixed(0)}% Complete
                          </span>
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatCurrency(remaining)} left
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {goals.length > 0 && (
                <>
                  {formatCurrency(goals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0))} allocated across {goals.length} goal{goals.length !== 1 ? 's' : ''}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SavingsGoalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreateGoal}
      />

      <WalletSavingsAllocation
        isOpen={showWalletAllocation}
        onClose={() => setShowWalletAllocation(false)}
        onSave={handleWalletAllocationSave}
      />
    </>,
    document.body
  );
}