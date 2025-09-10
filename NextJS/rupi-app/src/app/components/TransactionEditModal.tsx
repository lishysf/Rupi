'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, DollarSign, FileText, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

// Transaction type
interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  type: 'income' | 'expense';
}

// Props interface
interface TransactionEditModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, type: 'income' | 'expense', data: any) => Promise<boolean>;
}

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

export default function TransactionEditModal({ 
  transaction, 
  isOpen, 
  onClose, 
  onSave 
}: TransactionEditModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category
      });
      setError(null);
    }
  }, [transaction]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transaction) return;
    
    if (!formData.description.trim() || !formData.category.trim() || formData.amount <= 0) {
      setError('Please fill in all fields with valid values');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const updateData = {
        description: formData.description.trim(),
        amount: formData.amount,
        [transaction.type === 'expense' ? 'category' : 'source']: formData.category
      };
      
      const success = await onSave(transaction.id, transaction.type, updateData);
      if (success) {
        onClose();
      } else {
        setError('Failed to update transaction');
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setError(null);
    onClose();
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const availableOptions = isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[99999] animate-in fade-in duration-200"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto animate-in zoom-in-95 fade-in duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className={`w-5 h-5 ${
                  isIncome ? 'text-emerald-600' : 'text-red-600'
                }`} />
                Edit {isIncome ? 'Income' : 'Expense'}
              </CardTitle>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Description Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4" />
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description..."
                  required
                />
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <DollarSign className="w-4 h-4" />
                  Amount (IDR)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
                {formData.amount > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preview: {formatCurrency(formData.amount)}
                  </p>
                )}
              </div>

              {/* Category/Source Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Tag className="w-4 h-4" />
                  {isIncome ? 'Source' : 'Category'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select {isIncome ? 'source' : 'category'}...</option>
                  {availableOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Info */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span>Transaction ID: #{transaction.id}</span>
                  <span>{new Date(transaction.date).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isIncome 
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400' 
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );

  // Use portal to render outside of any stacking context
  return createPortal(modalContent, document.body);
}
