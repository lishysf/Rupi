'use client';

import { Target, Laptop, Car, Home, Plane, Plus, Trash2 } from 'lucide-react';
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
  const [showDistribution, setShowDistribution] = useState(false);
  const [allocations, setAllocations] = useState<Record<number, number>>({});

  // Calculate total saved money from savings transactions
  const totalSaved = savings.reduce((sum: number, saving: any) => {
    const amount = parseFloat(saving.amount) || 0;
    return sum + amount;
  }, 0);

  // Fetch savings goals from API
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/savings-goals');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGoals(data.data || []);
            // Initialize allocations with current amounts
            const initialAllocations: Record<number, number> = {};
            (data.data || []).forEach((goal: SavingsGoal) => {
              initialAllocations[goal.id] = goal.current_amount || 0;
            });
            setAllocations(initialAllocations);
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

  // Refresh goals when savings data changes (when new savings are added)
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
  }, [savings.length]); // Trigger when savings count changes

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
        // Refresh goals list
        const refreshResponse = await fetch('/api/savings-goals');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            setGoals(refreshData.data || []);
            // Update allocations to remove deleted goal
            setAllocations(prev => {
              const newAllocations = { ...prev };
              delete newAllocations[goalId];
              return newAllocations;
            });
          }
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to delete goal: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal');
    }
  };

  // Handle allocation changes
  const handleAllocationChange = (goalId: number, amount: number) => {
    // Ensure amount is non-negative
    const validAmount = Math.max(0, amount || 0);
    
    // Find the goal to get its target amount
    const goal = goals.find(g => g.id === goalId);
    const goalTarget = goal?.target_amount || 0;
    
    // Calculate current total allocation excluding this goal
    const currentTotalExcludingThis = Object.entries(allocations)
      .filter(([id]) => Number(id) !== goalId)
      .reduce((sum, [, allocAmount]) => sum + (allocAmount || 0), 0);
    
    // Calculate maximum allowed: min of (goal target, remaining total savings)
    const maxFromTotalSavings = totalSaved - currentTotalExcludingThis;
    const maxAllowed = Math.min(goalTarget, maxFromTotalSavings);
    const finalAmount = Math.min(validAmount, maxAllowed);
    
    // Debug logging
    console.log('Allocation change:', {
      goalId,
      goalTarget,
      requestedAmount: validAmount,
      maxFromTotalSavings,
      maxAllowed,
      finalAmount,
      currentTotalExcludingThis,
      totalSaved
    });
    
    setAllocations(prev => ({
      ...prev,
      [goalId]: finalAmount
    }));
  };

  // Calculate total allocated amount
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => {
    const validAmount = isNaN(amount) ? 0 : amount;
    return sum + validAmount;
  }, 0);
  const remainingToAllocate = totalSaved - totalAllocated;

  // Debug logging
  console.log('SavingsGoals Debug:', {
    savings: savings,
    totalSaved: totalSaved,
    allocations: allocations,
    totalAllocated: totalAllocated,
    remainingToAllocate: remainingToAllocate
  });

  // Handle save allocations
  const handleSaveAllocations = async () => {
    try {
      setError(null);
      console.log('Saving allocations:', allocations);
      
      // Update each goal's current_amount
      for (const [goalId, amount] of Object.entries(allocations)) {
        const validAmount = Math.max(0, Number(amount) || 0);
        console.log(`Updating goal ${goalId} with amount ${validAmount}`);
        const response = await fetch(`/api/savings-goals/${goalId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currentAmount: validAmount }),
        });
        
        const responseData = await response.json();
        console.log(`Response for goal ${goalId}:`, responseData);
        
        if (!response.ok) {
          throw new Error(`Failed to update goal ${goalId}: ${responseData.error || 'Unknown error'}`);
        }
      }
      
      // Refresh goals
      const refreshResponse = await fetch('/api/savings-goals');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setGoals(refreshData.data || []);
          console.log('Goals refreshed:', refreshData.data);
        }
      }
      
      setShowDistribution(false);
    } catch (error) {
      console.error('Error saving allocations:', error);
      setError(`Failed to save allocations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Calculate monthly savings needed and estimated completion
  const calculateMonthlySavings = (goal: SavingsGoal) => {
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    if (remaining <= 0) return { monthlyAmount: 0, monthsToComplete: 0, estimatedDate: null };

    if (goal.deadline) {
      // If deadline is set, calculate monthly amount needed
      const deadlineDate = new Date(goal.deadline);
      const now = new Date();
      const monthsRemaining = Math.max(1, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()));
      const monthlyAmount = Math.ceil(remaining / monthsRemaining);
      return { monthlyAmount, monthsToComplete: monthsRemaining, estimatedDate: goal.deadline };
    } else {
      // If no deadline, don't show monthly amount - just show remaining amount
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
        <div className="flex gap-2">
          {totalSaved > 0 && goals.length > 0 && (
            <button 
              onClick={() => {
                if (!showDistribution) {
                  // Reset allocations to current amounts when entering distribution mode
                  const resetAllocations: Record<number, number> = {};
                  goals.forEach(goal => {
                    resetAllocations[goal.id] = goal.current_amount;
                  });
                  setAllocations(resetAllocations);
                }
                setShowDistribution(!showDistribution);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {showDistribution ? 'Cancel' : 'Distribute'}
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            Add Goal
          </button>
        </div>
      </div>

      {/* Total Saved Money Display */}
      <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Money Saved</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(totalSaved)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              {totalAllocated > 0 ? `${formatCurrency(totalAllocated)} allocated` : 'Not allocated'}
            </div>
            {remainingToAllocate !== 0 && (
              <div className={`text-xs ${remainingToAllocate > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {remainingToAllocate > 0 ? `${formatCurrency(remainingToAllocate)} remaining` : `${formatCurrency(Math.abs(remainingToAllocate))} over-allocated`}
              </div>
            )}
          </div>
        </div>
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
            const currentAmount = showDistribution ? (allocations[goal.id] || 0) : (goal.current_amount || 0);
            const targetAmount = goal.target_amount || 0;
            const percentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
            const remaining = Math.max(0, targetAmount - currentAmount);
            const IconComponent = getIconComponent(goal.icon);
            const colors = getColorClasses(goal.color || 'blue');
            const { monthlyAmount, monthsToComplete, estimatedDate } = calculateMonthlySavings({...goal, current_amount: currentAmount});
            
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
                        {goal.deadline ? `Target: ${formatDate(goal.deadline)}` : 'No deadline set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${colors.text}`}>
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                    {!showDistribution && (
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {showDistribution ? (
                  // Distribution mode - show slider and quick buttons
                  <div className="mb-2">
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {formatCurrency(allocations[goal.id] || 0)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Target: {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Max: {formatCurrency(Math.min(goal.target_amount, totalSaved - (totalAllocated - (allocations[goal.id] || 0))))}
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.min(goal.target_amount, totalSaved - (totalAllocated - (allocations[goal.id] || 0)))}
                        step="100000"
                        value={allocations[goal.id] || 0}
                        onChange={(e) => handleAllocationChange(goal.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAllocationChange(goal.id, 0)}
                        className="flex-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          const currentAllocation = allocations[goal.id] || 0;
                          const maxFromTotalSavings = totalSaved - (totalAllocated - currentAllocation);
                          const fillAmount = Math.min(goal.target_amount, maxFromTotalSavings);
                          handleAllocationChange(goal.id, fillAmount);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                      >
                        Fill Goal
                      </button>
                      <button
                        onClick={() => handleAllocationChange(goal.id, Math.floor(remainingToAllocate / goals.length) + (allocations[goal.id] || 0))}
                        className="flex-1 px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"
                      >
                        Equal Split
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal mode - show progress bar
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300">
                        {formatCurrency(currentAmount)}
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
                )}

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(remaining)} left
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Distribution Controls */}
      {showDistribution && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleSaveAllocations}
              disabled={remainingToAllocate < 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Save Allocations
            </button>
            <button
              onClick={() => setShowDistribution(false)}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
          {remainingToAllocate < 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
              You've allocated more than your total savings. Please adjust the amounts.
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {goals.length > 0 && !showDistribution && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(goals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0))}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Allocated
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {goals.length > 0 ? ((goals.reduce((sum, goal) => {
                  const current = goal.current_amount || 0;
                  const target = goal.target_amount || 0;
                  return sum + (target > 0 ? (current / target) : 0);
                }, 0) / goals.length) * 100).toFixed(0) : 0}%
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
