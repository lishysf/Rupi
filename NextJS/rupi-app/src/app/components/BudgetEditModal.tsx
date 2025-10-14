'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Target, DollarSign, Tag, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

// Budget type
interface Budget {
  id?: number;
  category: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
}

// Props interface
interface BudgetEditModalProps {
  budget: Budget | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, amount: number) => Promise<boolean>;
  availableCategories: string[];
  mode: 'add' | 'edit';
}

// Expense categories (expanded to match backend)
const EXPENSE_CATEGORIES = [
  // Housing & Utilities
  'Rent',
  'Mortgage',
  'Electricity',
  'Water',
  'Internet',
  'Gas Utility',
  'Home Maintenance',
  'Household Supplies',

  // Food & Dining
  'Groceries',
  'Dining Out',
  'Coffee & Tea',
  'Food Delivery',

  // Transportation
  'Fuel',
  'Parking',
  'Public Transport',
  'Ride Hailing',
  'Vehicle Maintenance',
  'Toll',

  // Health & Personal
  'Medical & Pharmacy',
  'Health Insurance',
  'Fitness',
  'Personal Care',

  // Entertainment & Shopping
  'Clothing',
  'Electronics & Gadgets',
  'Subscriptions & Streaming',
  'Hobbies & Leisure',
  'Gifts & Celebration',

  // Financial Obligations
  'Debt Payments',
  'Taxes & Fees',
  'Bank Charges',

  // Family & Education
  'Childcare',
  'Education',
  'Pets',

  // Miscellaneous
  'Travel',
  'Business Expenses',
  'Charity & Donations',
  'Emergency',
  'Others'
] as const;

export default function BudgetEditModal({ 
  budget, 
  isOpen, 
  onClose, 
  onSave,
  availableCategories,
  mode
}: BudgetEditModalProps) {
  const [formData, setFormData] = useState({
    category: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when budget changes
  useEffect(() => {
    if (budget && mode === 'edit') {
      setFormData({
        category: budget.category || '',
        amount: (budget.amount || 0).toString()
      });
      setError(null);
    } else if (mode === 'add') {
      setFormData({
        category: '',
        amount: ''
      });
      setError(null);
    }
  }, [budget, mode]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category.trim() || !formData.amount.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const success = await onSave(formData.category, amount);
      if (success) {
        setFormData({ category: '', amount: '' });
        onClose();
      } else {
        setError('Failed to save budget');
      }
    } catch (err) {
      console.error('Error saving budget:', err);
      setError('Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setError(null);
    setFormData({ category: '', amount: '' });
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

  if (!isOpen) return null;

  const currentMonth = new Date().toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  const displayCategories = mode === 'edit' && budget 
    ? [budget.category] 
    : availableCategories;

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
                {mode === 'add' ? (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" />
                    Add Budget
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5 text-blue-600" />
                    Edit Budget
                  </>
                )}
              </CardTitle>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {mode === 'add' ? 'Set a spending budget for' : 'Update budget for'} {currentMonth}
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Category Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Tag className="w-4 h-4" />
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={mode === 'edit'}
                  required
                >
                  <option value="">Select category...</option>
                  {displayCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {mode === 'add' && availableCategories.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    All categories already have budgets set. Edit existing ones instead.
                  </p>
                )}
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <DollarSign className="w-4 h-4" />
                  Budget Amount (IDR)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter budget amount..."
                  min="0"
                  step="10000"
                  required
                />
                {formData.amount && parseFloat(formData.amount) > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Budget: {formatCurrency(parseFloat(formData.amount))}
                  </p>
                )}
              </div>

              {/* Current spending info for edit mode */}
              {mode === 'edit' && budget && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 dark:text-neutral-400">Current spent:</span>
                      <span className="font-medium">{formatCurrency(budget.spent || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 dark:text-neutral-400">Current budget:</span>
                      <span className="font-medium">{formatCurrency(budget.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600 dark:text-neutral-400">Usage:</span>
                      <span className={`font-medium ${
                        budget.amount && budget.amount > 0 && (budget.spent || 0) / budget.amount >= 1
                          ? 'text-red-600 dark:text-red-400'
                          : budget.amount && budget.amount > 0 && (budget.spent || 0) / budget.amount >= 0.8
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {budget.amount && budget.amount > 0 
                          ? (((budget.spent || 0) / budget.amount) * 100).toFixed(1)
                          : '0.0'
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Helper text */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200 text-xs">
                  💡 <strong>Tip:</strong> Set realistic budgets based on your spending patterns. 
                  You can always adjust them later as needed.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (mode === 'add' && availableCategories.length === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {mode === 'add' ? 'Create Budget' : 'Save Changes'}
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
