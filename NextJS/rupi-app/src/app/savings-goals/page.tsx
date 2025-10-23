'use client';

import { useState, useEffect } from 'react';
import { Target, Laptop, Car, Home, Plane, Plus, Trash2, Sliders, AlertTriangle, MinusCircle, Save, ArrowLeft } from 'lucide-react';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/app/components/Sidebar';
import SavingsGoalModal from '@/app/components/SavingsGoalModal';

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

function SavingsGoalsContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, fetchSavings } = useFinancialData();
  const { savings } = state.data;
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);
  
  // Allocation state
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSavings, setWalletSavings] = useState<Record<number, WalletSavings>>({});
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

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

  // Load goals and wallet data when page mounts
  useEffect(() => {
    loadGoals();
    loadAllocationData();
  }, []);

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
    }
  };

  // Handle creating new savings goal
  const handleCreateGoal = async (goalData: {name: string, targetAmount: number, targetDate: string | null, icon?: string | null, color?: string | null}) => {
    try {
      setError(null);
      const response = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: goalData.name,
          targetAmount: goalData.targetAmount,
          targetDate: goalData.targetDate,
          icon: goalData.icon,
          color: goalData.color
        }),
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

  // Load wallets and their savings data
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

    // Calculate total already allocated to OTHER goals (not this one)
    const allocatedToOtherGoals = goals
      .filter(g => g.id !== goalId)
      .reduce((sum, g) => sum + (parseFloat(String(g.allocated_amount)) || 0), 0);

    // Calculate total unallocated savings across all wallets
    const totalSavingsAllWallets = Object.values(walletSavings).reduce((sum, ws) => 
      sum + (ws.totalSavings || 0), 0
    );
    
    const totalUnallocated = Math.max(0, totalSavingsAllWallets - allocatedToOtherGoals);

    // For this wallet, calculate its share of available unallocated money
    const availableFromWallet = Math.min(wallet.totalSavings, totalUnallocated);

    // Also consider the target amount remaining for this specific goal
    const currentGoalAllocated = parseFloat(String(goal.allocated_amount)) || 0;
    const remainingTargetForGoal = Math.max(0, goal.target_amount - currentGoalAllocated);

    // Maximum is the minimum of: what's available and what's needed
    return Math.min(availableFromWallet, remainingTargetForGoal);
  };

  // Get total allocated to a goal
  const getTotalAllocatedToGoal = (goalId: number) => {
    return Object.entries(allocations)
      .filter(([key]) => key.startsWith(`${goalId}-`))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
  };

  // Save allocations
  const handleSaveAllocations = async (goalId: number) => {
    try {
      setAllocationLoading(true);
      setError(null);

      const goal = goals.find(g => g.id === goalId);
      if (!goal) return false;

      const currentTotalAllocated = parseFloat(String(goal.allocated_amount)) || 0;
      const newTotalAllocation = getTotalAllocatedToGoal(goalId);

      console.log('Setting allocation:', { 
        goalId, 
        currentTotalAllocated, 
        newTotalAllocation
      });

      // Step 1: Reset to 0 by deallocating all current allocation
      if (currentTotalAllocated > 0) {
        const response = await fetch('/api/savings-goals/deallocate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId, amount: currentTotalAllocated }),
        });

        const data = await response.json();
        if (!data.success) {
          setError(data.error || 'Failed to reset allocation');
          return false;
        }
      }

      // Step 2: Allocate the new amounts
      if (newTotalAllocation > 0) {
        const allocationArray = Object.entries(allocations)
          .filter(([key]) => key.startsWith(`${goalId}-`))
          .filter(([, amount]) => amount > 0)
          .map(([key, amount]) => {
            const [, walletId] = key.split('-').map(Number);
            return { goalId, walletId, amount };
          });

        if (allocationArray.length > 0) {
          const response = await fetch('/api/savings-goals/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations: allocationArray }),
          });

          const data = await response.json();
          if (!data.success) {
            setError(data.details || data.error || 'Failed to save allocations');
            return false;
          }
        }
      }

      // Refresh data
      await fetchSavings();
      await loadGoals();
      setExpandedGoal(null);
      setAllocations({});
      
      // Notify dashboard
      window.dispatchEvent(new CustomEvent('savingsGoalAllocated'));
      
      return true;
    } catch (error) {
      console.error('Error saving allocations:', error);
      setError('Failed to save allocations');
      return false;
    } finally {
      setAllocationLoading(false);
    }
  };

  if (status === 'loading' || state.loading.initial) {
    return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar currentPage="Savings Goals" />
        <div className="flex-1 lg:ml-64 pt-12 lg:pt-0 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (state.error) {
    return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar currentPage="Savings Goals" />
        <div className="flex-1 lg:ml-64 pt-12 lg:pt-0 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar currentPage="Savings Goals" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-12 lg:pt-0">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                    <Target className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    Savings Goals
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Manage your savings goals and allocate funds
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Goal
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Total Saved Money Display */}
        <div className="mb-6 p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Total Money Saved</div>
              <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {formatCurrency(totalSaved)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {goals.length > 0 ? `${goals.length} goal${goals.length !== 1 ? 's' : ''} set` : 'No goals yet'}
              </div>
              {goals.length > 0 && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {formatCurrency(allocableAmount)} available to allocate
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800">
            <Target className="w-24 h-24 text-neutral-300 dark:text-neutral-600 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">No savings goals yet</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Create your first savings goal to start tracking your progress toward your financial dreams
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-6 h-6" />
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const currentAmount = parseFloat(String(goal.current_amount)) || 0;
              const allocatedAmount = parseFloat(String(goal.allocated_amount)) || 0;
              const targetAmount = parseFloat(String(goal.target_amount)) || 0;
              const totalProgress = currentAmount + allocatedAmount;
              const percentage = targetAmount > 0 ? Math.min(100, (totalProgress / targetAmount) * 100) : 0;
              const remaining = Math.max(0, targetAmount - totalProgress);
              const IconComponent = getIconComponent(goal.icon);
              const colors = getColorClasses(goal.color || 'blue');
              
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${colors.icon}`}>
                        <IconComponent className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {goal.goal_name}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No deadline set'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id, goal.goal_name)}
                      className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {formatCurrency(totalProgress)}
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${colors.progress}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-lg font-bold ${colors.text}`}>
                        {percentage.toFixed(0)}% Complete
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatCurrency(remaining)} left
                      </span>
                    </div>
                  </div>

                  {/* Current Allocated Amount Display */}
                  {allocatedAmount > 0 && expandedGoal !== goal.id && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Currently Allocated</div>
                          <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {formatCurrency(allocatedAmount)}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Click "Allocate" to adjust
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Allocation Controls */}
                  {percentage < 100 && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <button
                        onClick={() => {
                          if (expandedGoal === goal.id) {
                            setExpandedGoal(null);
                            setAllocations({});
                          } else {
                            setExpandedGoal(goal.id);
                            setAllocations({});
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          {allocatedAmount > 0 ? 'Adjust allocation from wallets' : 'Allocate from wallets'}
                        </div>
                        <div className="text-xs">
                          {expandedGoal === goal.id ? 'Hide' : 'Show'}
                        </div>
                      </button>

                      {/* Expanded Allocation Interface */}
                      {expandedGoal === goal.id && (
                        <div className="mt-4 space-y-4">
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
                              {/* Show total available to allocate */}
                              {(() => {
                                const totalSavings = Object.values(walletSavings).reduce((sum, ws) => 
                                  sum + (ws.totalSavings || 0), 0
                                );
                                const allocatedToOtherGoals = goals
                                  .filter(g => g.id !== goal.id)
                                  .reduce((sum, g) => sum + (parseFloat(String(g.allocated_amount)) || 0), 0);
                                const availableToAllocate = Math.max(0, totalSavings - allocatedToOtherGoals);
                                
                                return availableToAllocate > 0 ? (
                                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                                        💰 Total available to allocate:
                                      </span>
                                      <span className="text-blue-800 dark:text-blue-200 font-bold">
                                        {formatCurrency(availableToAllocate)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="text-xs text-amber-800 dark:text-amber-200 text-center">
                                      ⚠️ All savings are already allocated to other goals
                                    </div>
                                  </div>
                                );
                              })()}

                              {wallets.map((wallet) => {
                                const walletSavingsData = walletSavings[wallet.id];
                                const maxAllocation = getMaxAllocation(goal.id, wallet.id);
                                const currentAllocation = allocations[`${goal.id}-${wallet.id}`] || 0;

                                if (!walletSavingsData || walletSavingsData.totalSavings <= 0) return null;

                                return (
                                  <div key={`${goal.id}-${wallet.id}`} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                    <div className="mb-2">
                                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                        {wallet.name}
                                      </span>
                                    </div>
                                    
                                    {/* Slider */}
                                    <div className="mb-3">
                                      <input
                                        type="range"
                                        min="0"
                                        max={maxAllocation}
                                        step="1000"
                                        value={currentAllocation}
                                        onChange={(e) => handleAllocationChange(goal.id, wallet.id, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                                        style={{
                                          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${maxAllocation > 0 ? (currentAllocation / maxAllocation) * 100 : 0}%, #E5E7EB ${maxAllocation > 0 ? (currentAllocation / maxAllocation) * 100 : 0}%, #E5E7EB 100%)`
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
                                        className="flex-1 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                                      />
                                      <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                        Max: {formatCurrency(maxAllocation)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Allocation Summary */}
                              <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-neutral-600 dark:text-neutral-400">Current allocation:</span>
                                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                                    {formatCurrency(allocatedAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-neutral-600 dark:text-neutral-400">Adjusting to:</span>
                                  <span className={`font-bold ${
                                    getTotalAllocatedToGoal(goal.id) > allocatedAmount 
                                      ? 'text-emerald-600 dark:text-emerald-400' 
                                      : getTotalAllocatedToGoal(goal.id) < allocatedAmount
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-blue-600 dark:text-blue-400'
                                  }`}>
                                    {formatCurrency(getTotalAllocatedToGoal(goal.id))}
                                    {getTotalAllocatedToGoal(goal.id) > allocatedAmount && ' ↑'}
                                    {getTotalAllocatedToGoal(goal.id) < allocatedAmount && ' ↓'}
                                  </span>
                                </div>
                                {getTotalAllocatedToGoal(goal.id) !== allocatedAmount && (
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-1">
                                    {getTotalAllocatedToGoal(goal.id) > allocatedAmount 
                                      ? `+${formatCurrency(getTotalAllocatedToGoal(goal.id) - allocatedAmount)} increase`
                                      : `${formatCurrency(allocatedAmount - getTotalAllocatedToGoal(goal.id))} decrease`
                                    }
                                  </div>
                                )}
                              </div>

                              {/* Save Button */}
                              <div className="flex justify-end pt-4">
                                <button
                                  onClick={() => handleSaveAllocations(goal.id)}
                                  disabled={allocationLoading || getTotalAllocatedToGoal(goal.id) === allocatedAmount}
                                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  {allocationLoading ? 'Saving...' : 'Save Changes'}
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
            }            )}
          </div>
        )}
          </div>
        </div>

        {/* Modals */}
        <SavingsGoalModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleCreateGoal}
        />
      </div>
    </div>
  );
}

export default function SavingsGoalsPage() {
  return (
    <FinancialDataProvider>
      <SavingsGoalsContent />
    </FinancialDataProvider>
  );
}

