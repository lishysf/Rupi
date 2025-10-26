'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Trash2, Plus } from 'lucide-react';

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

interface MultipleTransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: PendingTransaction[];
  onSave: (updatedTransactions: PendingTransaction[]) => void;
  isLoading?: boolean;
}

export default function MultipleTransactionEditModal({ 
  isOpen, 
  onClose, 
  transactions, 
  onSave, 
  isLoading = false 
}: MultipleTransactionEditModalProps) {
  const [editedTransactions, setEditedTransactions] = useState<PendingTransaction[]>(transactions || []);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Update editedTransactions when transactions prop changes
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      setEditedTransactions(transactions);
    }
  }, [transactions]);

  const handleSave = () => {
    // Validate all transactions
    const newErrors: Record<number, Record<string, string>> = {};
    let hasErrors = false;
    
    editedTransactions.forEach((transaction, index) => {
      const transactionErrors: Record<string, string> = {};
      
      if (!transaction.description.trim()) {
        transactionErrors.description = 'Description is required';
        hasErrors = true;
      }
      
      if (!transaction.amount || transaction.amount <= 0) {
        transactionErrors.amount = 'Amount must be greater than 0';
        hasErrors = true;
      }
      
      if (transaction.type === 'expense' && !transaction.category) {
        transactionErrors.category = 'Category is required';
        hasErrors = true;
      }
      
      if (transaction.type === 'income' && !transaction.source) {
        transactionErrors.source = 'Source is required';
        hasErrors = true;
      }
      
      if (transaction.type === 'transfer' && (!transaction.fromWalletName || !transaction.toWalletName)) {
        transactionErrors.transfer = 'Both wallets are required';
        hasErrors = true;
      }
      
      if (Object.keys(transactionErrors).length > 0) {
        newErrors[index] = transactionErrors;
      }
    });
    
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSave(editedTransactions);
  };

  const handleInputChange = (index: number, field: keyof PendingTransaction, value: string | number) => {
    setEditedTransactions(prev => prev.map((transaction, i) => 
      i === index ? { ...transaction, [field]: value } : transaction
    ));
    
    // Clear error for this field
    if (errors[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [field]: ''
        }
      }));
    }
  };

  const handleRemoveTransaction = (index: number) => {
    setEditedTransactions(prev => prev.filter((_, i) => i !== index));
    // Clear errors for this transaction
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Edit Multiple Transactions
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {editedTransactions.length} transaction(s) • Click to expand and edit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {editedTransactions.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions to edit</p>
            </div>
          ) : (
            editedTransactions.map((transaction, index) => (
              <div 
                key={index} 
                className={`border rounded-lg transition-all ${
                  errors[index] && Object.keys(errors[index]).length > 0
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {/* Transaction Header - Always Visible */}
                <div 
                  className="p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 capitalize">
                          {transaction.type}
                        </span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {transaction.description || 'No description'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Rp{transaction.amount.toLocaleString()}
                        {transaction.category && ` • ${transaction.category}`}
                        {transaction.source && ` • ${transaction.source}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTransaction(index);
                        }}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Remove transaction"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <svg 
                        className={`w-5 h-5 text-neutral-400 transition-transform ${expandedIndex === index ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Transaction Details - Expandable */}
                {expandedIndex === index && (
                  <div className="p-4 pt-0 space-y-3 border-t border-neutral-100 dark:border-neutral-700">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          errors[index]?.description 
                            ? 'border-red-500 dark:border-red-400' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                        placeholder="Transaction description"
                      />
                      {errors[index]?.description && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {errors[index].description}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        value={transaction.amount}
                        onChange={(e) => handleInputChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          errors[index]?.amount 
                            ? 'border-red-500 dark:border-red-400' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                        placeholder="0"
                      />
                      {errors[index]?.amount && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {errors[index].amount}
                        </p>
                      )}
                    </div>

                    {/* Category (for expense) */}
                    {transaction.type === 'expense' && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Category *
                        </label>
                        <input
                          type="text"
                          value={transaction.category || ''}
                          onChange={(e) => handleInputChange(index, 'category', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            errors[index]?.category 
                              ? 'border-red-500 dark:border-red-400' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                          placeholder="e.g., Food & Dining, Transport"
                        />
                        {errors[index]?.category && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {errors[index].category}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Source (for income) */}
                    {transaction.type === 'income' && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Source *
                        </label>
                        <input
                          type="text"
                          value={transaction.source || ''}
                          onChange={(e) => handleInputChange(index, 'source', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            errors[index]?.source 
                              ? 'border-red-500 dark:border-red-400' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                          placeholder="e.g., Salary, Freelance"
                        />
                        {errors[index]?.source && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {errors[index].source}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Wallet Info */}
                    {transaction.walletName && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Wallet
                        </label>
                        <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
                          {transaction.walletName}
                        </div>
                      </div>
                    )}

                    {/* Transfer Details */}
                    {transaction.type === 'transfer' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Transfer Details
                          </label>
                          <div className="space-y-2">
                            <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm">
                              <span className="text-neutral-600 dark:text-neutral-400">From:</span> <span className="font-medium text-neutral-900 dark:text-white">{transaction.fromWalletName}</span>
                            </div>
                            <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm">
                              <span className="text-neutral-600 dark:text-neutral-400">To:</span> <span className="font-medium text-neutral-900 dark:text-white">{transaction.toWalletName}</span>
                            </div>
                          </div>
                          {errors[index]?.transfer && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {errors[index].transfer}
                            </p>
                          )}
                        </div>

                        {/* Admin Fee - Editable */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Admin Fee (Optional)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-xs">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={transaction.adminFee || 0}
                              onChange={(e) => handleInputChange(index, 'adminFee', parseFloat(e.target.value) || 0)}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
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
                    {transaction.type === 'savings' && transaction.goalName && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Savings Goal
                        </label>
                        <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
                          {transaction.goalName}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || editedTransactions.length === 0}
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
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

