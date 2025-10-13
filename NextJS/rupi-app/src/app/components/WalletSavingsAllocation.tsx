'use client';

import { useState, useEffect } from 'react';
import { Target, Wallet, CreditCard, Smartphone, Building2, X, Save } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface WalletSavingsAllocationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (allocations: Array<{goalId: number, walletId: number, amount: number}>) => Promise<boolean>;
}

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
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

interface WalletSavings {
  walletId: number;
  totalSavings: number;
  savingsCount: number;
}

const WALLET_TYPES = [
  { value: 'bank_card', label: 'Bank Card', icon: CreditCard, color: '#3B82F6' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: '#10B981' },
  { value: 'cash', label: 'Cash', icon: Wallet, color: '#F59E0B' },
  { value: 'bank_account', label: 'Bank Account', icon: Building2, color: '#8B5CF6' },
];

export default function WalletSavingsAllocation({ isOpen, onClose, onSave }: WalletSavingsAllocationProps) {
  const { state } = useFinancialData();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSavings, setWalletSavings] = useState<Record<number, WalletSavings>>({});
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load goals
      const goalsResponse = await fetch('/api/savings-goals');
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        if (goalsData.success) {
          setGoals(goalsData.data || []);
        }
      }

      // Load wallets
      setWallets(state.data.wallets);

      // Load savings for each wallet
      const savingsData: Record<number, WalletSavings> = {};
      for (const wallet of state.data.wallets) {
        const savingsResponse = await fetch(`/api/wallets/${wallet.id}/savings`);
        if (savingsResponse.ok) {
          const savingsResult = await savingsResponse.json();
          if (savingsResult.success) {
            savingsData[wallet.id] = {
              walletId: wallet.id,
              totalSavings: savingsResult.data.totalSavings,
              savingsCount: savingsResult.data.savingsCount
            };
          }
        }
      }
      setWalletSavings(savingsData);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (goalId: number, walletId: number, amount: number) => {
    const key = `${goalId}-${walletId}`;
    setAllocations(prev => ({
      ...prev,
      [key]: Math.max(0, amount || 0)
    }));
  };

  const handleInputChange = (goalId: number, walletId: number, value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(cleanValue) || 0;
    
    // Get the maximum allowed allocation for this goal-wallet combination
    const maxAllowed = getMaxAllocation(goalId, walletId);
    const finalValue = Math.min(numericValue, maxAllowed);
    
    handleAllocationChange(goalId, walletId, finalValue);
  };

  const getMaxAllocation = (goalId: number, walletId: number) => {
    const goal = goals.find(g => g.id === goalId);
    const wallet = walletSavings[walletId];
    if (!goal || !wallet) return 0;

    const remainingGoalAmount = Math.max(0, goal.target_amount - goal.current_amount);
    return Math.min(remainingGoalAmount, wallet.totalSavings);
  };

  const getTotalAllocatedToGoal = (goalId: number) => {
    return Object.entries(allocations)
      .filter(([key]) => key.startsWith(`${goalId}-`))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
  };

  const getTotalAllocatedFromWallet = (walletId: number) => {
    return Object.entries(allocations)
      .filter(([key]) => key.endsWith(`-${walletId}`))
      .reduce((sum, [, amount]) => sum + (amount || 0), 0);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const allocationArray = Object.entries(allocations)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => {
          const [goalId, walletId] = key.split('-').map(Number);
          return { goalId, walletId, amount };
        });

      const success = await onSave(allocationArray);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving allocations:', error);
      setError('Failed to save allocations');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getIconComponent = (iconName: string | null) => {
    const icons: Record<string, any> = {
      'laptop': Target,
      'car': Target,
      'home': Target,
      'plane': Target,
    };
    return icons[iconName || ''] || Target;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Allocate Savings to Goals
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Distribute your savings from different wallets to your goals
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Goals and Wallets Grid */}
              {goals.map((goal) => {
                const IconComponent = getIconComponent(goal.icon);
                const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
                const totalAllocatedToGoal = getTotalAllocatedToGoal(goal.id);

                return (
                  <div key={goal.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{goal.goal_name}</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Target: {formatCurrency(goal.target_amount)} | 
                          Current: {formatCurrency(goal.current_amount)} | 
                          Remaining: {formatCurrency(remainingAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(totalAllocatedToGoal)} allocated
                        </p>
                      </div>
                    </div>

                    {/* Wallet Allocation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {wallets.map((wallet) => {
                        const walletType = WALLET_TYPES.find(t => t.value === wallet.type);
                        const WalletIconComponent = walletType?.icon || Wallet;
                        const savings = walletSavings[wallet.id];
                        const key = `${goal.id}-${wallet.id}`;
                        const currentAllocation = allocations[key] || 0;
                        const maxAllocation = getMaxAllocation(goal.id, wallet.id);
                        const totalAllocatedFromWallet = getTotalAllocatedFromWallet(wallet.id);

                        if (!savings || savings.totalSavings <= 0) {
                          return (
                            <div key={wallet.id} className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                              <div className="flex items-center gap-2 mb-2">
                                <div 
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                                  style={{ backgroundColor: wallet.color }}
                                >
                                  <WalletIconComponent className="w-3 h-3" />
                                </div>
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                  {wallet.name}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                                No savings available
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div key={wallet.id} className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div 
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                                style={{ backgroundColor: wallet.color }}
                              >
                                <WalletIconComponent className="w-3 h-3" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                  {wallet.name}
                                </span>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                  Available: {formatCurrency(savings.totalSavings)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-neutral-600 dark:text-neutral-400">Allocate</span>
                                <span className="text-neutral-600 dark:text-neutral-400">
                                  Max: {formatCurrency(maxAllocation)}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={currentAllocation || ''}
                                onChange={(e) => handleInputChange(goal.id, wallet.id, e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                placeholder="0"
                              />
                              <div className="flex justify-between text-xs">
                                <span className="text-neutral-500 dark:text-neutral-500">
                                  From wallet: {formatCurrency(totalAllocatedFromWallet)}
                                </span>
                                <span className="text-neutral-500 dark:text-neutral-500">
                                  Remaining: {formatCurrency(savings.totalSavings - totalAllocatedFromWallet)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
            {Object.keys(allocations).filter(key => allocations[key] > 0).length} allocations configured
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || Object.keys(allocations).filter(key => allocations[key] > 0).length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Allocations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
