'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface PendingTransaction {
  type: 'income' | 'expense' | 'savings' | 'transfer';
  description: string;
  amount: number;
  category?: string;
  source?: string;
  walletName?: string;
  goalName?: string;
  fromWalletName?: string;
  toWalletName?: string;
  adminFee?: number;
  walletId?: number;
  fromWalletId?: number;
  toWalletId?: number;
}

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PendingTransaction;
  onSave: (updatedTransaction: PendingTransaction) => void;
  isLoading?: boolean;
}

export default function TransactionEditModal({ 
  isOpen, 
  onClose, 
  transaction, 
  onSave, 
  isLoading = false 
}: TransactionEditModalProps) {
  const [editedTransaction, setEditedTransaction] = useState<PendingTransaction>(transaction || {
    type: 'expense',
    description: '',
    amount: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update editedTransaction when transaction prop changes
  useEffect(() => {
    if (transaction) {
      setEditedTransaction(transaction);
    }
  }, [transaction]);

  const handleSave = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!editedTransaction.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!editedTransaction.amount || editedTransaction.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (editedTransaction.type === 'expense' && !editedTransaction.category) {
      newErrors.category = 'Category is required for expenses';
    }
    
    if (editedTransaction.type === 'income' && !editedTransaction.source) {
      newErrors.source = 'Source is required for income';
    }
    
    if (editedTransaction.type === 'transfer' && (!editedTransaction.fromWalletName || !editedTransaction.toWalletName)) {
      newErrors.transfer = 'Both source and destination wallets are required for transfers';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSave(editedTransaction);
  };

  const handleInputChange = (field: keyof PendingTransaction, value: string | number) => {
    setEditedTransaction(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Edit Transaction
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Transaction Type
            </label>
            <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 capitalize">
              {editedTransaction.type}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={editedTransaction.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.description 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-neutral-300 dark:border-neutral-600'
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
              placeholder="Enter transaction description"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Amount (Rp) *
            </label>
            <input
              type="number"
              value={editedTransaction.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.amount 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-neutral-300 dark:border-neutral-600'
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Category (for expenses) */}
          {editedTransaction.type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Category *
              </label>
              <input
                type="text"
                value={editedTransaction.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.category 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                placeholder="e.g., Food & Dining, Transportation"
              />
              {errors.category && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.category}
                </p>
              )}
            </div>
          )}

          {/* Source (for income) */}
          {editedTransaction.type === 'income' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Source *
              </label>
              <input
                type="text"
                value={editedTransaction.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.source 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                placeholder="e.g., Salary, Freelance, Investment"
              />
              {errors.source && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.source}
                </p>
              )}
            </div>
          )}

          {/* Wallet */}
          {editedTransaction.walletName && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Wallet
              </label>
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
                {editedTransaction.walletName}
              </div>
            </div>
          )}

          {/* Transfer Details */}
          {editedTransaction.type === 'transfer' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Transfer Details
                </label>
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">From:</span> <span className="font-medium text-neutral-900 dark:text-white">{editedTransaction.fromWalletName}</span>
                  </div>
                  <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">To:</span> <span className="font-medium text-neutral-900 dark:text-white">{editedTransaction.toWalletName}</span>
                  </div>
                </div>
                {errors.transfer && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.transfer}
                  </p>
                )}
              </div>

              {/* Admin Fee - Editable */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Admin Fee (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={editedTransaction.adminFee || 0}
                    onChange={(e) => handleInputChange('adminFee', parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Enter the transfer admin fee if applicable (default: Rp0)
                </p>
              </div>
            </div>
          )}

          {/* Savings Goal */}
          {editedTransaction.type === 'savings' && editedTransaction.goalName && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Savings Goal
              </label>
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
                {editedTransaction.goalName}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}