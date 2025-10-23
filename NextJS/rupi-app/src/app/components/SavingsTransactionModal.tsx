'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PiggyBank, TrendingDown, AlertCircle } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useRouter } from 'next/navigation';

interface Wallet {
  id: number;
  name: string;
  balance: number;
}

interface SavingsGoal {
  id: number;
  goal_name: string;
  target_amount: number;
  allocated_amount: number;
}

interface AllocatedMoneyError {
  error: string;
  message: string;
  details: {
    totalSavings: number;
    totalAllocated: number;
    availableToWithdraw: number;
    requestedAmount: number;
    allocatedGoals: Array<{
      goal_name: string;
      allocated_amount: number;
    }>;
  };
}

interface SavingsTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'deposit' | 'withdrawal';
}

export default function SavingsTransactionModal({ isOpen, onClose, transactionType }: SavingsTransactionModalProps) {
  const router = useRouter();
  const { fetchSavings, fetchWallets } = useFinancialData();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocatedMoneyError, setAllocatedMoneyError] = useState<AllocatedMoneyError | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    walletId: '',
    goalName: ''
  });

  // Load wallets and goals when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWallets();
      loadGoals();
    } else {
      // Reset form when modal closes
      setFormData({ description: '', amount: '', walletId: '', goalName: '' });
      setError(null);
      setAllocatedMoneyError(null);
    }
  }, [isOpen]);

  const loadWallets = async () => {
    try {
      const response = await fetch('/api/wallets');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWallets(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading wallets:', err);
    }
  };

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/savings-goals');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGoals(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.walletId) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAllocatedMoneyError(null);

      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          amount,
          walletId: parseInt(formData.walletId),
          goalName: formData.goalName || undefined,
          type: transactionType
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchSavings();
        await fetchWallets();
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('savingsGoalsUpdated'));
        
        onClose();
      } else {
        // Check if it's the allocated money error
        if (data.error === 'ALLOCATED_MONEY') {
          setAllocatedMoneyError(data as AllocatedMoneyError);
        } else {
          setError(data.error || data.details || 'Failed to process transaction');
        }
      }
    } catch (err) {
      console.error('Error submitting savings transaction:', err);
      setError('Failed to process transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSavingsGoalsPage = () => {
    onClose();
    // Route to savings goals page
    router.push('/savings-goals');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${transactionType === 'deposit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'} rounded-lg flex items-center justify-center`}>
              {transactionType === 'deposit' ? (
                <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {transactionType === 'deposit' ? 'Deposit to Savings' : 'Withdraw from Savings'}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {transactionType === 'deposit' ? 'Save money to your goals' : 'Withdraw from your savings'}
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
        <div className="p-6">
          {/* Allocated Money Error */}
          {allocatedMoneyError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Cannot Withdraw Allocated Money
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    {allocatedMoneyError.message}
                  </p>
                  
                  <div className="bg-white dark:bg-neutral-800 rounded p-3 mb-3">
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Total Savings:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(allocatedMoneyError.details.totalSavings)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Allocated:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatCurrency(allocatedMoneyError.details.totalAllocated)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="font-medium text-neutral-900 dark:text-white">Available:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(allocatedMoneyError.details.availableToWithdraw)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {allocatedMoneyError.details.allocatedGoals.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">
                        Money allocated to:
                      </p>
                      <ul className="text-xs space-y-1">
                        {allocatedMoneyError.details.allocatedGoals.map((goal, index) => (
                          <li key={index} className="flex justify-between text-red-800 dark:text-red-200">
                            <span>• {goal.goal_name}</span>
                            <span className="font-medium">{formatCurrency(goal.allocated_amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleOpenSavingsGoalsPage}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Go to Savings Goals to Deallocate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Regular Error */}
          {error && !allocatedMoneyError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Monthly savings, Emergency fund"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Amount (Rp) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                step="1000"
                min="0"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                required
              />
            </div>

            {/* Wallet */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {transactionType === 'deposit' ? 'From Wallet' : 'To Wallet'} *
              </label>
              <select
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                required
              >
                <option value="">Select wallet</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({formatCurrency(wallet.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Goal (optional) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Savings Goal (Optional)
              </label>
              <select
                value={formData.goalName}
                onChange={(e) => setFormData({ ...formData, goalName: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">No specific goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.goal_name}>
                    {goal.goal_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-3 ${
                transactionType === 'deposit' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Processing...' : transactionType === 'deposit' ? 'Deposit to Savings' : 'Withdraw from Savings'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

