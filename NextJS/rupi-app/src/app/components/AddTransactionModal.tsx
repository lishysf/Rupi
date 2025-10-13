'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Wallet, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useFinancialData } from '@/contexts/FinancialDataContext';

// Wallet types and icons
const WALLET_TYPES = [
  { value: 'bank_card', label: 'Bank Card', icon: CreditCard, color: '#3B82F6' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: '#10B981' },
  { value: 'cash', label: 'Cash', icon: Wallet, color: '#F59E0B' },
  { value: 'bank_account', label: 'Bank Account', icon: Building2, color: '#8B5CF6' },
];

// Expense categories
const EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Food & Groceries', 
  'Transportation',
  'Health & Personal',
  'Entertainment & Shopping',
  'Debt Payments',
  'Savings & Investments',
  'Family & Others'
] as const;

// Income sources
const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Bonus',
  'Gift',
  'Others'
] as const;

interface UserWallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'income' | 'expense';
  onTransactionAdded: () => void;
}

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  transactionType,
  onTransactionAdded 
}: AddTransactionModalProps) {
  const { state, fetchWallets, refreshAfterTransaction } = useFinancialData();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    walletId: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load wallets when modal opens and update from context
  useEffect(() => {
    if (isOpen) {
      // First try to get wallets from context
      if (state.data.wallets.length > 0) {
        setWallets(state.data.wallets);
      } else {
        // If no wallets in context, fetch them
        loadWallets();
      }
    }
  }, [isOpen, state.data.wallets]);

  const loadWallets = async () => {
    try {
      // Try to fetch wallets through context first
      await fetchWallets();
      
      // If still no wallets, try direct API call as fallback
      if (state.data.wallets.length === 0) {
        const response = await fetch('/api/wallets');
        const data = await response.json();
        if (data.success) {
          setWallets(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading wallets:', err);
      setError('Failed to load wallets');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.amount || !formData.category.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!formData.walletId) {
      setError('Please select a wallet');
      return;
    }


    try {
      setLoading(true);
      setError(null);

      const endpoint = transactionType === 'income' ? '/api/income' : '/api/expenses';
      const payload = {
        description: formData.description.trim(),
        amount: amount,
        [transactionType === 'income' ? 'source' : 'category']: formData.category,
        walletId: parseInt(formData.walletId),
        date: formData.date
      };


      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        // Small delay to ensure database has updated
        await new Promise(resolve => setTimeout(resolve, 500));
        // Refresh all data including wallet balances
        await refreshAfterTransaction();
        onTransactionAdded();
        handleClose();
      } else {
        setError(data.error || `Failed to add ${transactionType}`);
      }
    } catch (err) {
      console.error(`Error adding ${transactionType}:`, err);
      setError(`Failed to add ${transactionType}`);
    } finally {
      setLoading(false);
    }
  };

  // Close form
  const handleClose = () => {
    setFormData({
      description: '',
      amount: '',
      category: '',
      walletId: '',
      date: new Date().toISOString().split('T')[0]
    });
    setError(null);
    onClose();
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

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Add {transactionType === 'income' ? 'Income' : 'Expense'}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                {transactionType === 'income' ? 'Record money received' : 'Record money spent'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={`e.g., ${transactionType === 'income' ? 'Salary payment' : 'Grocery shopping'}`}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Category/Source */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {transactionType === 'income' ? 'Source' : 'Category'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Select {transactionType === 'income' ? 'source' : 'category'}...</option>
                  {(transactionType === 'income' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Wallet Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Wallet ({wallets.length} available)
                </label>
                {wallets.length === 0 ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                    No wallets found. Please create a wallet first.
                    <br />
                    <div className="mt-2 space-x-2">
                      <button 
                        type="button"
                        onClick={() => window.location.reload()}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Refresh page
                      </button>
                      <button 
                        type="button"
                        onClick={loadWallets}
                        className="text-green-600 hover:text-green-800 underline"
                      >
                        Retry loading wallets
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.walletId}
                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select wallet...</option>
                    {wallets.map((wallet) => {
                      const walletType = WALLET_TYPES.find(t => t.value === wallet.type);
                      const IconComponent = walletType?.icon || Wallet;
                      
                      return (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name} - {formatCurrency(wallet.balance)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || wallets.length === 0}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    transactionType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Adding...' : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
