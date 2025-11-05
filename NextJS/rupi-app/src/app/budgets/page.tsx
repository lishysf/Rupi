'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, Plus, Edit2, Trash2, PieChart } from 'lucide-react';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/app/components/Sidebar';
import BudgetEditModal from '@/app/components/BudgetEditModal';
import { useLanguage } from '@/contexts/LanguageContext';

// Expense categories
const EXPENSE_CATEGORIES = [
  'Rent', 'Mortgage', 'Electricity', 'Water', 'Internet', 'Gas Utility', 'Home Maintenance', 'Household Supplies',
  'Groceries', 'Dining Out', 'Coffee & Tea', 'Food Delivery',
  'Fuel', 'Parking', 'Public Transport', 'Ride Hailing', 'Vehicle Maintenance', 'Toll',
  'Medical & Pharmacy', 'Health Insurance', 'Fitness', 'Personal Care',
  'Clothing', 'Electronics & Gadgets', 'Subscriptions & Streaming', 'Hobbies & Leisure', 'Gifts & Celebration',
  'Debt Payments', 'Taxes & Fees', 'Bank Charges',
  'Childcare', 'Education', 'Pets',
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

function BudgetTrackingContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, saveBudget, deleteBudget } = useFinancialData();
  let t = (key: string) => key;
  let translateCategory = (c: string) => c;
  try { const lang = useLanguage(); t = lang.t; translateCategory = lang.translateCategory; } catch {}
  const { budgets } = state.data;

  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Calculate total budget and spent
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 100;
  const overallSpentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Get available categories for dropdown
  const usedCategories = budgets.map(b => b.category);
  const availableCategories = EXPENSE_CATEGORIES.filter(cat => !usedCategories.includes(cat));

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    if (percentage >= 75) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800';
  };

  if (status === 'loading' || state.loading.initial) {
    return (
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar currentPage="Budget Tracking" />
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
        <Sidebar currentPage="Budget Tracking" />
        <div className="flex-1 lg:ml-64 pt-12 lg:pt-0 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar currentPage="Budget Tracking" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-12 lg:pt-0">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                    <PieChart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    Budget Tracking
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Manage your monthly budgets and track spending
                  </p>
                </div>
              </div>
              <button
                onClick={startAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Budget
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Overall Summary */}
            <div className="mb-6 p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Total Monthly Budget</div>
                  <div className="text-4xl font-bold text-neutral-900 dark:text-white mt-1">
                    {formatCurrency(totalBudget)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Spent</div>
                  <div className={`text-2xl font-bold ${getTextColor(overallSpentPercentage)}`}>
                    {formatCurrency(totalSpent)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `${formatCurrency(Math.abs(totalRemaining))} over budget`}
                  </div>
                </div>
              </div>
              
              {/* Overall Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className={`font-medium ${getTextColor(overallSpentPercentage)}`}>
                    {formatCurrency(totalRemaining >= 0 ? totalRemaining : 0)}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {overallPercentage.toFixed(1)}% remaining
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-300 ${getProgressColor(overallSpentPercentage)}`}
                    style={{ width: `${Math.max(Math.min(overallPercentage, 100), 0)}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Spent: {formatCurrency(totalSpent)}
                </span>
                {budgets.length > 0 && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {budgets.length} budget{budgets.length !== 1 ? 's' : ''} set
                  </span>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Budget List */}
            {budgets.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800">
                <PieChart className="w-24 h-24 text-neutral-300 dark:text-neutral-600 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">No budgets set yet</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                  Create your first budget to start tracking your monthly spending and stay on top of your finances
                </p>
                <button
                  onClick={startAdd}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-6 h-6" />
                  Create Your First Budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {budgets.map((budget) => {
                  const spentPercentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                  const remainingPercentage = budget.amount > 0 ? ((budget.amount - budget.spent) / budget.amount) * 100 : 100;
                  const remaining = budget.amount - budget.spent;
                  
                  return (
                    <div
                      key={budget.category}
                      className={`p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-shadow ${getBgColor(spentPercentage)}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                            {translateCategory(budget.category)}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {formatCurrency(budget.amount)} budgeted
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(budget)}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit budget"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(budget.category)}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete budget"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className={`font-medium ${getTextColor(spentPercentage)}`}>
                            {formatCurrency(remaining >= 0 ? remaining : 0)}
                          </span>
                          <span className="text-neutral-500 dark:text-neutral-400">
                            {remainingPercentage.toFixed(0)}% remaining
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor(spentPercentage)}`}
                            style={{ width: `${Math.max(Math.min(remainingPercentage, 100), 0)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Spent/Over Budget */}
                      <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        {remaining >= 0 ? (
                          <>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">Spent</span>
                            <span className={`text-sm font-semibold ${getTextColor(spentPercentage)}`}>
                              {formatCurrency(budget.spent)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Over Budget
                            </span>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(budget.spent)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        <BudgetEditModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingBudget(null);
            setError(null);
          }}
          onSave={handleModalSave}
          mode={modalMode}
          budget={editingBudget}
          availableCategories={modalMode === 'add' ? availableCategories : EXPENSE_CATEGORIES as unknown as string[]}
        />
      </div>
    </div>
  );
}

export default function BudgetTrackingPage() {
  return (
    <FinancialDataProvider>
      <BudgetTrackingContent />
    </FinancialDataProvider>
  );
}

