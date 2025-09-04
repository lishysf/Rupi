'use client';

import { useState } from 'react';
import { Target, TrendingUp, AlertCircle, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

// Expense categories - duplicated here to avoid importing server-side modules
const EXPENSE_CATEGORIES = [
  'Housing & Utilities',
  'Food & Groceries', 
  'Transportation',
  'Health & Personal',
  'Entertainment & Shopping',
  'Debt & Savings',
  'Family & Others'
] as const;

interface Budget {
  id?: number;
  category: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
}

interface BudgetTrackingProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BudgetTracking({ widgetSize = 'medium' }: BudgetTrackingProps) {
  const { state, saveBudget, deleteBudget } = useFinancialData();
  const { budgets } = state.data;
  const loading = state.loading.initial && budgets.length === 0;
  
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: ''
  });

  // Enhanced delete with confirmation
  const handleDeleteBudget = async (category: string) => {
    if (!confirm(`Are you sure you want to delete the budget for "${category}"?`)) {
      return;
    }

    try {
      const success = await deleteBudget(category);
      if (!success) {
        setError('Failed to delete budget');
      }
    } catch (err) {
      setError('Failed to delete budget');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const success = await saveBudget(formData.category, amount);
      if (success) {
        setFormData({ category: '', amount: '' });
        setShowAddForm(false);
        setEditingBudget(null);
        setError(null);
      } else {
        setError('Failed to save budget');
      }
    } catch (err) {
      setError('Failed to save budget');
    }
  };

  // Handle edit
  const startEdit = (budget: Budget) => {
    setEditingBudget(budget.category);
    setFormData({
      category: budget.category,
      amount: budget.budget.toString()
    });
    setShowAddForm(false);
  };

  // Cancel edit/add
  const cancelForm = () => {
    setFormData({ category: '', amount: '' });
    setShowAddForm(false);
    setEditingBudget(null);
    setError(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getBackgroundColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    if (percentage >= 80) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    return 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
  };

  const totalBudget = budgets.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Get available categories for dropdown
  const usedCategories = budgets.map(b => b.category);
  const availableCategories = EXPENSE_CATEGORIES.filter(cat => !usedCategories.includes(cat));

  // Adjust number of items based on widget size
  const getItemLimit = () => {
    switch (widgetSize) {
      case 'half': return 2;
      case 'medium': return 3;
      case 'long': return 5;
      default: return 3;
    }
  };

  const visibleBudgets = budgets.slice(0, getItemLimit());

  // Only show loading on initial load, not on updates
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className={`${widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600 dark:text-blue-400 mr-2`} />
            <h2 className={`${widgetSize === 'half' ? 'text-base' : 'text-lg'} font-semibold text-slate-900 dark:text-white`}>
              Budget Tracking
            </h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Target className={`${
            widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'
          } text-blue-600 dark:text-blue-400 mr-2`} />
          <h2 className={`${
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } font-semibold text-slate-900 dark:text-white`}>
            Budget Tracking
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            title="Add Budget"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingBudget) && (
        <form onSubmit={handleSubmit} className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-1 gap-2">
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="text-xs p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              disabled={!!editingBudget}
              required
            >
              <option value="">Select Category</option>
              {editingBudget ? (
                <option value={editingBudget}>{editingBudget}</option>
              ) : (
                availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))
              )}
            </select>
            <input
              type="number"
              placeholder="Budget Amount (IDR)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="text-xs p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              min="0"
              step="1000"
              required
            />
            <div className="flex gap-1">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded text-xs flex items-center justify-center"
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white p-1.5 rounded text-xs flex items-center justify-center"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Overall Budget Summary */}
      {budgets.length > 0 && (
        <div className={`${
          widgetSize === 'half' ? 'mb-2 p-2' : 'mb-3 p-3'
        } bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex-shrink-0`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`${
              widgetSize === 'half' ? 'text-xs' : 'text-sm'
            } font-medium text-blue-900 dark:text-blue-100`}>
              Monthly Budget
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className={`${
              widgetSize === 'half' ? 'text-sm' : 'text-lg'
            } font-bold text-blue-900 dark:text-blue-100`}>
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              of {formatCurrency(totalBudget)}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(totalSpent, totalBudget)}`}
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Individual Budget Items */}
      <div className={`flex-1 ${
        widgetSize === 'half' ? 'space-y-1' : 'space-y-2'
      } overflow-y-auto`}>
        {budgets.length === 0 && !showAddForm ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              No budgets set for this month
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Set Your First Budget
            </button>
          </div>
        ) : (
          visibleBudgets.map((budget) => {
            const percentage = budget.budget > 0 ? (budget.spent / budget.budget) * 100 : 0;
            const isOverspending = percentage >= 100;
            
            return (
              <div
                key={budget.category}
                className={`${
                  widgetSize === 'half' ? 'p-1.5' : 'p-2'
                } rounded-lg border ${getBackgroundColor(budget.spent, budget.budget)}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className={`${
                      widgetSize === 'half' ? 'text-xs' : 'text-sm'
                    } font-medium text-slate-900 dark:text-white`}>
                      {budget.category}
                    </span>
                    {isOverspending && (
                      <AlertCircle className="w-3 h-3 text-red-500 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {percentage.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => startEdit(budget)}
                      className="p-0.5 text-slate-400 hover:text-blue-600"
                      title="Edit Budget"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.category)}
                      className="p-0.5 text-slate-400 hover:text-red-600"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {formatCurrency(budget.spent)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {formatCurrency(budget.budget)}
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${getProgressColor(budget.spent, budget.budget)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats */}
      {budgets.length > 0 && (
        <div className={`${
          widgetSize === 'half' ? 'mt-2 pt-2' : 'mt-3 pt-3'
        } border-t border-slate-200 dark:border-slate-700 flex-shrink-0`}>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className={`${
                widgetSize === 'half' ? 'text-xs' : 'text-sm'
              } font-bold text-emerald-600 dark:text-emerald-400`}>
                {budgets.filter(b => (b.spent / b.budget) * 100 < 80).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                On Track
              </div>
            </div>
            <div className="text-center">
              <div className={`${
                widgetSize === 'half' ? 'text-xs' : 'text-sm'
              } font-bold text-red-600 dark:text-red-400`}>
                {budgets.filter(b => (b.spent / b.budget) * 100 >= 100).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Over Budget
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}