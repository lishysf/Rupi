'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, Laptop, Car, Home, Plane, Plus, Trash2, X, Wallet, Edit3, Save, Sliders, AlertTriangle } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import SavingsGoalModal from './SavingsGoalModal';

interface SavingsGoalsPopupProps {
  isOpen: boolean;
  onClose: () => void;
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

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface WalletSavings {
  totalSavings: number;
  savingsCount: number;
}

export default function SavingsGoalsPopup({ isOpen, onClose }: SavingsGoalsPopupProps) {
  const { state, fetchSavings } = useFinancialData();
  const { savings } = state.data;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Allocation state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSavings, setWalletSavings] = useState<Record<number, WalletSavings>>({});
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  // Calculate total saved money from savings transactions
  const totalSaved = savings.reduce((sum: number, saving: any) => {
    const amount = parseFloat(saving.amount) || 0;
    return sum + amount;
  }, 0);

  // Calculate total allocated amount across all goals
  const totalAllocated = goals.reduce((sum: number, goal: any) => {
    const allocatedAmount = parseFloat(goal.allocated_amount) || 0;
    return sum + allocatedAmount;
  }, 0);

  // Calculate allocable amount (total saved - total allocated)
  const allocableAmount = Math.max(0, totalSaved - totalAllocated);


  // Load goals and wallet data when popup opens
  useEffect(() => {
    if (isOpen) {
      loadGoals();
      loadAllocationData(); // Load wallet data immediately when popup opens
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
          
          // Notify dashboard to refresh
          window.dispatchEvent(new CustomEvent('savingsGoalCreated'));
          
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
        
        // Notify dashboard to refresh
        window.dispatchEvent(new CustomEvent('savingsGoalsUpdated'));
      } else {
        const errorData = await response.json();
        setError(`Failed to delete goal: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal');
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

  // Load wallets and their savings data for allocation (when popup opens)
  const loadAllocationData = async () => {
    try {
      setAllocationLoading(true);
      
      // Load wallets
      const walletsResponse = await fetch('/api/wallets');
      let walletsList: Wallet[] = [];
      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json();
        if (walletsData.success) {
          walletsList = walletsData.data || [];
          setWallets(walletsList);
        }
      }

      // Load savings data for each wallet
      const walletSavingsData: Record<number, WalletSavings> = {};
      for (const wallet of walletsList) {
        const savingsResponse = await fetch(`/api/wallets/${wallet.id}/savings`);
        if (savingsResponse.ok) {
          const savingsData = await savingsResponse.json();
          if (savingsData.success) {
            walletSavingsData[wallet.id] = {
              totalSavings: savingsData.data.totalSavings || 0,
              savingsCount: savingsData.data.savingsCount || 0
            };
          }
        }
      }
      setWalletSavings(walletSavingsData);
    } catch (error) {
      console.error('Error loading allocation data:', error);
      setError('Failed to load wallet data for allocation');
    } finally {
      setAllocationLoading(false);
    }
  };

  // Handle allocation change
  const handleAllocationChange = (goalId: number, walletId: number, amount: number) => {
    const key = `${goalId}-${walletId}`;
    setAllocations(prev => ({
      ...prev,
      [key]: amount
    }));
  };

  // Handle input change with validation
  const handleInputChange = (goalId: number, walletId: number, value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(cleanValue) || 0;
    
    const maxAllowed = getMaxAllocation(goalId, walletId);
    const finalValue = Math.min(numericValue, maxAllowed);
    
    handleAllocationChange(goalId, walletId, finalValue);
  };

  // Get maximum allowed allocation for a goal-wallet combination
  const getMaxAllocation = (goalId: number, walletId: number) => {
    const goal = goals.find(g => g.id === goalId);
    const wallet = walletSavings[walletId];
    if (!goal || !wallet) return 0;

    // Calculate remaining target amount (considering already allocated amount)
    const currentAllocated = goal.allocated_amount || 0;
    const remainingTarget = Math.max(0, goal.target_amount - currentAllocated);
    
    return Math.min(remainingTarget, wallet.totalSavings);
  };

  // Get total allocated to a goal
  const getTotalAllocatedToGoal = (goalId: number) => {
    return Object.entries(allocations)
      .filter(([key]) => key.startsWith(`${goalId}-`))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
  };

  // Get total allocated from a wallet
  const getTotalAllocatedFromWallet = (walletId: number) => {
    return Object.entries(allocations)
      .filter(([key]) => key.endsWith(`-${walletId}`))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
  };

  // Check if goal allocations are affected by withdrawals
  const checkAllocationHealth = (goal: any) => {
    const currentAmount = parseFloat(String(goal.current_amount)) || 0;
    const allocatedAmount = parseFloat(String(goal.allocated_amount)) || 0;
    const targetAmount = parseFloat(String(goal.target_amount)) || 0;
    
    // Only show warnings if there are actual allocations to this goal
    if (allocatedAmount <= 0) {
      return { hasWarning: false };
    }
    
    // If current amount is negative (due to withdrawals exceeding deposits)
    // and there are allocations, show warning
    if (currentAmount < 0) {
      return {
        hasWarning: true,
        message: `Withdrawals have exceeded deposits for this goal. Consider reducing allocations by Rp${Math.abs(currentAmount).toLocaleString()}.`,
        severity: 'high'
      };
    }
    
    // If current amount is positive but significantly less than allocated amount
    // Only warn if the difference is substantial (more than 20% of allocated amount)
    if (currentAmount > 0 && currentAmount < (allocatedAmount * 0.8)) {
      return {
        hasWarning: true,
        message: `Current savings (Rp${currentAmount.toLocaleString()}) is significantly less than allocated amount (Rp${allocatedAmount.toLocaleString()}). Consider adjusting allocations.`,
        severity: 'medium'
      };
    }
    
    return { hasWarning: false };
  };

  // Save allocations
  const handleSaveAllocations = async () => {
    try {
      setAllocationLoading(true);
      setError(null);

      const allocationArray = Object.entries(allocations)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => {
          const [goalId, walletId] = key.split('-').map(Number);
          return { goalId, walletId, amount };
        });

      console.log('Sending allocation data:', { allocations: allocationArray });

      const response = await fetch('/api/savings-goals/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allocations: allocationArray }),
      });

      const data = await response.json();
      
      console.log('Allocation response:', data);
      
      if (data.success) {
        // Refresh goals and savings data
        await fetchSavings();
        await loadGoals();
        setExpandedGoal(null);
        setAllocations({});
        
        // Notify dashboard to refresh
        window.dispatchEvent(new CustomEvent('savingsGoalAllocated'));
        
        return true;
      } else {
        const errorMessage = data.details || data.error || 'Failed to save allocations';
        console.error('Allocation failed:', errorMessage);
        setError(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Error saving allocations:', error);
      setError('Failed to save allocations');
      return false;
    } finally {
      setAllocationLoading(false);
    }
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
              {allocationLoading && (
                <div className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading wallet data...</span>
                </div>
              )}
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
                  const currentAmount = parseFloat(String(goal.current_amount)) || 0;
                  const allocatedAmount = parseFloat(String(goal.allocated_amount)) || 0;
                  const targetAmount = parseFloat(String(goal.target_amount)) || 0;
                  const totalProgress = currentAmount + allocatedAmount;
                  const percentage = targetAmount > 0 ? Math.min(100, (totalProgress / targetAmount) * 100) : 0;
                  const remaining = Math.max(0, targetAmount - totalProgress);
                  const allocableToGoal = Math.max(0, targetAmount - allocatedAmount);
                  const IconComponent = getIconComponent(goal.icon);
                  const colors = getColorClasses(goal.color || 'blue');
                  const allocationHealth = checkAllocationHealth(goal);
                  
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
                            {formatCurrency(totalProgress)}
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

                      {/* Allocation Health Warning */}
                      {allocationHealth.hasWarning && (
                        <div className={`mb-3 p-3 rounded-lg border ${
                          allocationHealth.severity === 'high' 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        }`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              allocationHealth.severity === 'high' 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-amber-600 dark:text-amber-400'
                            }`} />
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                allocationHealth.severity === 'high' 
                                  ? 'text-red-800 dark:text-red-200' 
                                  : 'text-amber-800 dark:text-amber-200'
                              }`}>
                                {allocationHealth.severity === 'high' ? 'Allocation Adjustment Needed' : 'Allocation Review Recommended'}
                              </p>
                              <p className={`text-xs mt-1 ${
                                allocationHealth.severity === 'high' 
                                  ? 'text-red-700 dark:text-red-300' 
                                  : 'text-amber-700 dark:text-amber-300'
                              }`}>
                                {allocationHealth.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Allocation Controls */}
                      {remaining > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                          <button
                            onClick={() => {
                              if (expandedGoal === goal.id) {
                                setExpandedGoal(null);
                              } else {
                                setExpandedGoal(goal.id);
                                // Wallet data is already loaded when popup opened
                              }
                            }}
                            className="w-full flex items-center justify-between p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Sliders className="w-4 h-4" />
                              Allocate from wallets
                            </div>
                            <div className="text-xs">
                              {expandedGoal === goal.id ? 'Hide' : 'Show'}
                            </div>
                          </button>

                          {/* Expanded Allocation Interface */}
                          {expandedGoal === goal.id && (
                            <div className="mt-3 space-y-3">
                              {allocationLoading ? (
                                <div className="text-center py-4">
                                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Loading wallet data...</p>
                                </div>
                              ) : wallets.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No wallets available</p>
                                </div>
                              ) : (
                                <>
                                  {wallets.map((wallet) => {
                                    const walletSavingsData = walletSavings[wallet.id];
                                    const maxAllocation = getMaxAllocation(goal.id, wallet.id);
                                    const currentAllocation = allocations[`${goal.id}-${wallet.id}`] || 0;

                                    if (!walletSavingsData || walletSavingsData.totalSavings <= 0) return null;

                                    return (
                                      <div key={`${goal.id}-${wallet.id}`} className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                            {wallet.name}
                                          </span>
                                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {formatCurrency(walletSavingsData.totalSavings)} available
                                          </span>
                                        </div>
                                        
                                        {/* Slider */}
                                        <div className="mb-2">
                                          <input
                                            type="range"
                                            min="0"
                                            max={maxAllocation}
                                            step="1000"
                                            value={currentAllocation}
                                            onChange={(e) => handleAllocationChange(goal.id, wallet.id, parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                                            style={{
                                              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentAllocation / maxAllocation) * 100}%, #E5E7EB ${(currentAllocation / maxAllocation) * 100}%, #E5E7EB 100%)`
                                            }}
                                          />
                                        </div>

                                        {/* Manual Input */}
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={currentAllocation > 0 ? currentAllocation.toLocaleString() : ''}
                                            onChange={(e) => handleInputChange(goal.id, wallet.id, e.target.value)}
                                            placeholder="0"
                                            className="flex-1 px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                          />
                                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Max: {formatCurrency(maxAllocation)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Goal Allocation Summary */}
                                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-600">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-neutral-600 dark:text-neutral-400">Total allocated:</span>
                                      <span className="font-medium text-blue-600 dark:text-blue-400">
                                        {formatCurrency(getTotalAllocatedToGoal(goal.id))}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Save Button for this goal */}
                                  <div className="flex justify-end">
                                    <button
                                      onClick={handleSaveAllocations}
                                      disabled={allocationLoading || getTotalAllocatedToGoal(goal.id) === 0}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <Save className="w-3 h-3" />
                                      {allocationLoading ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                  {formatCurrency(totalSaved)} total saved • {formatCurrency(allocableAmount)} available to allocate
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

    </>,
    document.body
  );
}