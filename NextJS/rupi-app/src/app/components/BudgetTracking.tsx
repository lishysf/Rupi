'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Target, TrendingUp, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import BudgetEditModal from './BudgetEditModal';

// Expense categories - expanded to match backend categories
const EXPENSE_CATEGORIES = [
  // Housing & Utilities
  'Rent', 'Mortgage', 'Electricity', 'Water', 'Internet', 'Gas Utility', 'Home Maintenance', 'Household Supplies',
  // Food & Dining
  'Groceries', 'Dining Out', 'Coffee & Tea', 'Food Delivery',
  // Transportation
  'Fuel', 'Parking', 'Public Transport', 'Ride Hailing', 'Vehicle Maintenance', 'Toll',
  // Health & Personal
  'Medical & Pharmacy', 'Health Insurance', 'Fitness', 'Personal Care',
  // Entertainment & Shopping
  'Clothing', 'Electronics & Gadgets', 'Subscriptions & Streaming', 'Hobbies & Leisure', 'Gifts & Celebration',
  // Financial Obligations
  'Debt Payments', 'Taxes & Fees', 'Bank Charges',
  // Family & Education
  'Childcare', 'Education', 'Pets',
  // Miscellaneous
  'Travel', 'Business Expenses', 'Charity & Donations', 'Emergency', 'Others'
] as const;

interface Budget {
  id?: number;
  category: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
}

interface BudgetTrackingProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function BudgetTracking({ widgetSize = 'medium' }: BudgetTrackingProps) {
  const { state, saveBudget, deleteBudget } = useFinancialData();
  let t = (key: string) => key;
  let translateCategory = (c: string) => c;
  try { const lang = useLanguage(); t = lang.t; translateCategory = lang.translateCategory; } catch {}
  const { budgets } = state.data;
  const loading = state.loading.initial && budgets.length === 0;
  
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

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

  // Handle modal save
  const handleModalSave = async (category: string, amount: number) => {
    try {
      setError(null);
      const success = await saveBudget(category, amount);
      if (!success) {
        setError('Failed to save budget');
        return false;
      }
      return true;
    } catch (err) {
      setError('Failed to save budget');
      return false;
    }
  };

  // Handle edit
  const startEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Handle add
  const startAdd = () => {
    setEditingBudget(null);
    setModalMode('add');
    setModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
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
    return 'bg-neutral-50 dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-600';
  };

  const totalBudget = budgets.reduce((sum, item) => sum + item.amount, 0);
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
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className={`${widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-600 dark:text-emerald-400 mr-2`} />
            <h2 className={`${widgetSize === 'half' ? 'text-base' : 'text-lg'} font-semibold text-neutral-900 dark:text-neutral-100`}>
              {t('budgetTracking')}
            </h2>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="flex-1 space-y-3">
          {/* Overall budget skeleton */}
          <div className="bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 rounded-lg p-3 animate-pulse">
            <div className="flex justify-between items-center mb-2">
              <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-24"></div>
              <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-8"></div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="h-5 bg-neutral-300 dark:bg-neutral-600 rounded w-20"></div>
              <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-16"></div>
            </div>
            <div className="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-1.5"></div>
          </div>
          
          {/* Individual budget items skeleton */}
          {Array.from({ length: getItemLimit() }).map((_, index) => (
            <div key={index} className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-2 animate-pulse">
              <div className="flex justify-between items-center mb-1">
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-20"></div>
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-6"></div>
              </div>
              <div className="flex justify-between items-center mb-1">
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-16"></div>
                <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-12"></div>
              </div>
              <div className="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Target className={`${
            widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'
          } text-emerald-600 dark:text-emerald-400 mr-2`} />
          <h2 className={`${
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } font-semibold text-neutral-900 dark:text-neutral-100`}>
            Budget Tracking
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </div>
          <button
            onClick={startAdd}
            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs"
            title={t('addBudget')}
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


      {/* Overall Budget Summary */}
      {budgets.length > 0 && (
        <div className={`${
          widgetSize === 'half' ? 'mb-2 p-2' : 'mb-3 p-3'
        } bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex-shrink-0`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`${
              widgetSize === 'half' ? 'text-xs' : 'text-sm'
            } font-medium text-emerald-900 dark:text-emerald-100`}>
              {t('monthlyBudget')}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className={`${
              widgetSize === 'half' ? 'text-sm' : 'text-lg'
            } font-bold text-emerald-900 dark:text-emerald-100`}>
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              {t('ofLabel')} {formatCurrency(totalBudget)}
            </span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-1.5">
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
        {budgets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Target className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
              {t('noBudgetsThisMonth')}
            </p>
            <button
              onClick={startAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('setFirstBudget')}
            </button>
          </div>
        ) : (
          visibleBudgets.map((budget) => {
            const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
            const isOverspending = percentage >= 100;
            
            return (
              <div
                key={budget.category}
                className={`${
                  widgetSize === 'half' ? 'p-1.5' : 'p-2'
                } rounded-lg border ${getBackgroundColor(budget.spent, budget.amount)}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className={`${
                      widgetSize === 'half' ? 'text-xs' : 'text-sm'
                    } font-medium text-neutral-900 dark:text-neutral-100`}>
                      {translateCategory(budget.category)}
                    </span>
                    {isOverspending && (
                      <AlertCircle className="w-3 h-3 text-red-500 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      {percentage.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => startEdit(budget)}
                      className="p-0.5 text-neutral-400 hover:text-emerald-600"
                      title={t('editBudget')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.category)}
                      className="p-0.5 text-neutral-400 hover:text-red-600"
                      title={t('deleteBudget')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(budget.spent)}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    / {formatCurrency(budget.amount)}
                  </span>
                </div>

                <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${getProgressColor(budget.spent, budget.amount)}`}
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
        } border-t border-neutral-200 dark:border-transparent flex-shrink-0`}>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className={`${
                widgetSize === 'half' ? 'text-xs' : 'text-sm'
              } font-bold text-emerald-600 dark:text-emerald-400`}>
                {budgets.filter(b => (b.spent / b.amount) * 100 < 80).length}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('onTrack')}
              </div>
            </div>
            <div className="text-center">
              <div className={`${
                widgetSize === 'half' ? 'text-xs' : 'text-sm'
              } font-bold text-red-600 dark:text-red-400`}>
                {budgets.filter(b => (b.spent / b.amount) * 100 >= 100).length}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('overBudget')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Edit Modal */}
      <BudgetEditModal
        budget={editingBudget}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        availableCategories={availableCategories}
        mode={modalMode}
      />
    </div>
  );
}