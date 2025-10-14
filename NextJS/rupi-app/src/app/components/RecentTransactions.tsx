'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Car, Coffee, ShoppingBag, Utensils, Home, Calendar, Zap, Plane, Heart, GamepadIcon, CreditCard, Users, DollarSign, TrendingUp, Briefcase, Gift, Edit3, Trash2 } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TransactionEditModal from './TransactionEditModal';
import AddTransactionModal from './AddTransactionModal';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  type: 'income' | 'expense' | 'savings' | 'investment' | 'transfer';
  wallet_id?: number;
  isTransfer?: boolean;
  transferAmount?: number;
  fromWallet?: number;
  toWallet?: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface Income {
  id: number;
  description: string;
  amount: number;
  source: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface RecentTransactionsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function RecentTransactions({ widgetSize = 'long' }: RecentTransactionsProps) {
  const { state, deleteTransaction, updateTransaction, deleteSavings, updateSavings, updateInvestment, deleteInvestment, fetchTransactions } = useFinancialData();
  let t = (key: string) => key;
  let translateCategory = (c: string) => c;
  try { const lang = useLanguage(); t = lang.t; translateCategory = lang.translateCategory; } catch {}
  const { transactions, savings } = state.data as {transactions: Array<{id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}>, savings: Array<{id: number, type: string, description: string, amount: number | string, date: string, goal_name?: string}>};
  const loading = state.loading.initial && transactions.length === 0;
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'txn' | 'savings'>('all');
  const [editingTransaction, setEditingTransaction] = useState<{
    id: number;
    description: string;
    amount: number;
    category: string;
    date: string;
    created_at: string;
    updated_at: string;
    type: 'income' | 'expense' | 'savings' | 'investment';
  } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'income' | 'expense'>('income');

  // Handle delete transaction
  const handleDelete = async (transaction: Transaction) => {
    if (deleting === transaction.id) return;
    
    try {
      setDeleting(transaction.id);
      setError(null);
      
      if (transaction.isTransfer) {
        // For grouped transfer transactions, we need to delete both the outgoing and incoming transactions
        // Find the corresponding transaction pair
        const correspondingTransaction = allTransactions.find((t: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => 
          t.id !== transaction.id && 
          t.type === 'transfer' &&
          Math.abs(Number(t.amount)) === Math.abs(Number(transaction.amount)) &&
          Math.abs(new Date(t.date).getTime() - new Date(transaction.date).getTime()) < 1000
        );
        
        if (correspondingTransaction) {
          // Delete both transactions
          const success1 = await deleteTransaction(transaction.id, 'expense'); // Use expense as fallback
          const success2 = await deleteTransaction(correspondingTransaction.id, 'expense'); // Use expense as fallback
          
          if (!success1 || !success2) {
            setError('Failed to delete transfer transaction');
          } else {
            // Optimistic update already applied by context; no extra refetch needed
          }
        } else {
          // Fallback: delete just the current transaction
          const success = await deleteTransaction(transaction.id, 'expense'); // Use expense as fallback
          if (!success) {
            setError('Failed to delete transfer transaction');
          } else {
            // Optimistic update already applied by context
          }
        }
      } else if (transaction.type === 'savings') {
        // Extract original ID from prefixed ID (e.g., "savings-1" -> 1)
        const originalId = typeof transaction.id === 'string' 
          ? parseInt((transaction.id as string).split('-')[1]) 
          : transaction.id as number;
        const success = await deleteSavings(originalId);
        if (!success) {
          setError('Failed to delete savings transaction');
        } else {
          // Optimistic update will be reflected on next context refresh
        }
      } else if (transaction.type === 'investment') {
        // Extract original ID from prefixed ID (e.g., "investment-1" -> 1)
        const originalId = typeof transaction.id === 'string' 
          ? parseInt((transaction.id as string).split('-')[1]) 
          : transaction.id as number;
        const success = await deleteInvestment(originalId);
        if (!success) {
          setError('Failed to delete investment transaction');
        } else {
          // Optimistic update will be reflected on next context refresh
        }
      } else {
        const success = await deleteTransaction(transaction.id, transaction.type === 'transfer' ? 'expense' : transaction.type);
        if (!success) {
          setError('Failed to delete transaction');
        }
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Failed to delete transaction');
    } finally {
      setDeleting(null);
    }
  };

  // Handle edit transaction
  const handleEdit = (transaction: Transaction) => {
    // Keep original type so modal can render correctly
    const editable = {
      ...transaction,
      category: transaction.category || (transaction.type === 'savings' ? 'Savings' : transaction.type === 'investment' ? 'Investment' : ''),
      type: (transaction.type as 'income' | 'expense' | 'savings' | 'investment')
    };
    setEditingTransaction(editable);
  };

  // Handle close edit modal
  const handleCloseEdit = () => {
    setEditingTransaction(null);
  };

  // Handle save edit from modal
  const handleSaveEdit = async (id: number, type: 'income' | 'expense', data: {description: string, amount: number, category?: string, source?: string, wallet_id?: number}) => {
    try {
      setError(null);
      const original = allTransactions.find((t: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => t.id === id);
      let success = false;
      if (original?.type === 'savings') {
        // Extract original ID from prefixed ID
        const originalId = typeof id === 'string' 
          ? parseInt((id as string).split('-')[1]) 
          : id as number;
        // Map modal data to savings fields
        const payload = {
          description: data.description,
          amount: data.amount,
          goalName: data.category,
        };
        success = await updateSavings(originalId, payload);
        if (success) {
          await fetchTransactions();
        }
      } else if (original?.type === 'investment') {
        // Extract original ID from prefixed ID
        const originalId = typeof id === 'string' 
          ? parseInt((id as string).split('-')[1]) 
          : id as number;
        const payload = {
          description: data.description,
          amount: data.amount,
          assetName: data.category,
        };
        success = await updateInvestment(originalId, payload);
        if (success) {
          await fetchTransactions();
        }
      } else {
        success = await updateTransaction(id, type, data);
      }
      if (!success) {
        setError('Failed to update transaction');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction');
      return false;
    }
  };

  // Get icon and color for category
  const getCategoryInfo = (category: string, type: 'income' | 'expense' | 'savings' | 'investment') => {
    if (type === 'income') {
      const incomeCategories: Record<string, { icon: React.ComponentType<{className?: string}>; color: string }> = {
        'Salary': { icon: Briefcase, color: 'text-blue-600 dark:text-blue-400' },
        'Freelance': { icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400' },
        'Business': { icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
        'Investment': { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
        'Bonus': { icon: Gift, color: 'text-yellow-600 dark:text-yellow-400' },
        'Gift': { icon: Gift, color: 'text-pink-600 dark:text-pink-400' },
        'Others': { icon: DollarSign, color: 'text-gray-600 dark:text-gray-400' },
      };
      return incomeCategories[category] || { icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' };
    } else if (type === 'savings') {
      return { icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' };
    } else if (type === 'investment') {
      return { icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400' };
    } else {
      const expenseCategories: Record<string, { icon: React.ComponentType<{className?: string}>; color: string }> = {
        'Housing & Utilities': { icon: Home, color: 'text-orange-600 dark:text-orange-400' },
        'Food & Groceries': { icon: Utensils, color: 'text-green-600 dark:text-green-400' },
        'Transportation': { icon: Car, color: 'text-blue-600 dark:text-blue-400' },
        'Health & Personal': { icon: Heart, color: 'text-red-600 dark:text-red-400' },
        'Entertainment & Shopping': { icon: ShoppingBag, color: 'text-purple-600 dark:text-purple-400' },
        'Debt Payments': { icon: CreditCard, color: 'text-red-600 dark:text-red-400' },
        'Savings & Investments': { icon: TrendingUp, color: 'text-cyan-600 dark:text-cyan-400' },
        'Family & Others': { icon: Users, color: 'text-gray-600 dark:text-gray-400' },
        // Fallbacks for old categories
        'Transport': { icon: Car, color: 'text-blue-600 dark:text-blue-400' },
        'Food': { icon: Utensils, color: 'text-green-600 dark:text-green-400' },
        'Bills': { icon: Home, color: 'text-orange-600 dark:text-orange-400' },
        'Shopping': { icon: ShoppingBag, color: 'text-purple-600 dark:text-purple-400' },
        'Coffee': { icon: Coffee, color: 'text-amber-600 dark:text-amber-400' },
      };
      return expenseCategories[category] || { icon: Coffee, color: 'text-gray-600 dark:text-gray-400' };
    }
  };


  // Limit transactions based on widget size
  const getTransactionLimit = () => {
    switch (widgetSize) {
      case 'square': return 3;
      case 'half': return 4;
      case 'long': return 6;
      default: return 6;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    
    // Check if the time is exactly midnight (00:00:00)
    // This usually indicates a date-only input without time
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // If it's exactly midnight, it's likely a date-only input
    // In this case, we'll show the created_at time instead if available
    if (hours === 0 && minutes === 0 && seconds === 0) {
      // Try to get the created_at time from the transaction
      const transaction = allTransactions.find((t: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => t.date === dateString);
      if (transaction && transaction.created_at) {
        const createdDate = new Date(transaction.created_at);
        return new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(createdDate);
      }
      // If no created_at, show a default time or hide time
      return '--:--';
    }
    
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  // Use transactions array which already includes all data (expenses, income, savings)
  // No need to combine with separate savings array as it causes duplication
  const allTransactions = transactions.map((txn: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => ({
    ...txn,
    uniqueKey: txn.id, // Use the already unique ID from context
    type: txn.type as 'income' | 'expense' | 'savings' | 'investment' | 'transfer'
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group transfer transactions to avoid showing duplicates
  const groupedTransactions = [];
  const processedIds = new Set();
  
  for (const transaction of allTransactions) {
    if (processedIds.has(transaction.id)) continue;
    
    if (transaction.type === 'transfer') {
      // Find the corresponding transfer transaction (outgoing/incoming pair)
      const correspondingTransaction = allTransactions.find((t: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => 
        t.id !== transaction.id && 
        t.type === 'transfer' &&
        Math.abs(Number(t.amount)) === Math.abs(Number(transaction.amount)) &&
        Math.abs(new Date(t.date).getTime() - new Date(transaction.date).getTime()) < 1000 && // Within 1 second
        t.description.includes('Transfer') && 
        transaction.description.includes('Transfer')
      );
      
      if (correspondingTransaction) {
        // Create a single grouped transfer entry
        const fromTransaction = Number(transaction.amount) < 0 ? transaction : correspondingTransaction;
        const toTransaction = Number(transaction.amount) > 0 ? transaction : correspondingTransaction;
        
        // Extract wallet names from the description
        // fromTransaction (negative amount): "Transfer to GoPay" -> "GoPay" (destination)
        // toTransaction (positive amount): "Transfer from BCA" -> "BCA" (source)
        const fromWalletName = toTransaction.description.includes('from ') 
          ? toTransaction.description.split('from ')[1]?.split(':')[0]?.trim() || `Wallet ${toTransaction.wallet_id}`
          : `Wallet ${toTransaction.wallet_id}`;
        const toWalletName = fromTransaction.description.includes('to ') 
          ? fromTransaction.description.split('to ')[1]?.split(':')[0]?.trim() || `Wallet ${fromTransaction.wallet_id}`
          : `Wallet ${fromTransaction.wallet_id}`;
        
        groupedTransactions.push({
          ...fromTransaction,
          uniqueKey: `transfer-${fromTransaction.id}`,
          isTransfer: true,
          transferAmount: Math.abs(Number(fromTransaction.amount)),
          fromWallet: fromTransaction.wallet_id,
          toWallet: toTransaction.wallet_id,
          description: `${fromWalletName} → ${toWalletName}` // Clear wallet-to-wallet description
        });
        
        processedIds.add(transaction.id);
        processedIds.add(correspondingTransaction.id);
      } else {
        // Single transfer transaction (shouldn't happen but handle gracefully)
        groupedTransactions.push(transaction);
        processedIds.add(transaction.id);
      }
    } else {
      // Non-transfer transaction, add as-is
      groupedTransactions.push(transaction);
      processedIds.add(transaction.id);
    }
  }

  const filtered = groupedTransactions.filter((t: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string}) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'txn') return t.type === 'income' || t.type === 'expense';
    if (activeFilter === 'savings') return t.type === 'savings';
    return true;
  });

  const limitedTransactions = filtered.slice(0, getTransactionLimit());

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${widgetSize === 'square' ? 'text-base' : 'text-lg'} font-semibold text-neutral-900 dark:text-neutral-100`}>
            {t('recentTransactions')}
          </h2>
          <div className="w-4 h-4 animate-spin border-2 border-emerald-400 border-t-transparent rounded-full"></div>
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: getTransactionLimit() }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-lg border border-neutral-200 dark:border-transparent p-3 sm:p-4 lg:p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <h2 className={`${
          widgetSize === 'square' ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
        } font-semibold text-neutral-900 dark:text-neutral-100`}>
          Recent Transactions
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-3 flex gap-1 sm:gap-2 overflow-x-auto">
        {[
          { key: 'all', label: t('filterAll') },
          { key: 'txn', label: t('filterTxn') },
          { key: 'savings', label: t('filterSavings') },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm border whitespace-nowrap flex-shrink-0 ${
              activeFilter === tab.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`flex-1 overflow-y-auto ${
        widgetSize === 'square' ? 'space-y-2' : 'space-y-3'
      }`}>
        {limitedTransactions.length === 0 && !loading ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {t('noTransactions')}
            </p>
          </div>
        ) : (
          limitedTransactions.map((transaction: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number, created_at?: string, updated_at?: string, isTransfer?: boolean, uniqueKey?: number, transferAmount?: number}) => {
          const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
          const IconComponent = categoryInfo.icon;
          const isIncome = transaction.type === 'income';
          const isSavings = transaction.type === 'savings';
          const isTransfer = transaction.isTransfer || transaction.type === 'transfer';
          const isDeleting = deleting === transaction.id;
          
          return (
            <div
              key={transaction.uniqueKey}
              className={`flex items-center justify-between ${
                widgetSize === 'square' ? 'p-2' : 'p-2 sm:p-3'
              } rounded-lg sm:rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors group`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className={`${
                  widgetSize === 'square' ? 'p-1.5' : 'p-1.5 sm:p-2'
                } rounded-lg mr-2 sm:mr-3 flex-shrink-0 ${
                  isIncome 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                    : isSavings
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : isTransfer
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-neutral-100 dark:bg-neutral-700'
                }`}>
                  {isTransfer ? (
                    <ArrowUpRight className={`${
                      widgetSize === 'square' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-5 sm:h-5'
                    } text-purple-600 dark:text-purple-400`} />
                  ) : (
                    <IconComponent className={`${
                      widgetSize === 'square' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4 sm:w-5 sm:h-5'
                    } ${categoryInfo.color}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`${
                    widgetSize === 'square' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                  } font-medium text-neutral-900 dark:text-neutral-100 truncate`}>
                    {transaction.description}
                  </div>
                  {widgetSize !== 'square' && (
                    <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 flex items-center flex-wrap gap-1">
                      <span className="truncate max-w-[120px] sm:max-w-none">{translateCategory(transaction.category)}</span>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="flex-shrink-0">{formatDate(transaction.date)}</span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex-shrink-0">{formatTime(transaction.date)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                {/* Action buttons - shown on hover or for square widgets */}
                <div className={`flex gap-1 ${
                  widgetSize === 'square' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } transition-opacity`}>
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('editTransaction')}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(transaction)}
                    disabled={deleting === transaction.id}
                    className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title={t('deleteTransaction')}
                  >
                    {deleting === transaction.id ? (
                      <div className="w-3 h-3 animate-spin border border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
                
                {/* Amount */}
                <div className="text-right min-w-0">
                  <div className={`${
                    widgetSize === 'square' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                  } font-semibold ${
                    isIncome 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : isSavings
                      ? 'text-blue-600 dark:text-blue-400'
                      : isTransfer
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-red-600 dark:text-red-400'
                  } break-words`}>
                    {isTransfer 
                      ? formatCurrency(transaction.transferAmount || Math.abs(Number(transaction.amount)))
                      : `${isIncome ? '+' : isSavings ? '💎' : '-'}${formatCurrency(Math.abs(Number(transaction.amount)))}`
                    }
                  </div>
                  {widgetSize === 'square' && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(transaction.date)} • {formatTime(transaction.date)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Quick Action - Add Activity chooser */}
      {widgetSize !== 'square' && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div className={`${widgetSize === 'half' ? 'w-full' : ''}`}>
            <details className="group">
              <summary className={`list-none cursor-pointer ${
                widgetSize === 'half' ? 'w-full' : 'inline-flex'
              } bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm flex items-center justify-between`}>
                <span>{t('addActivity')}</span>
                <span className="ml-2 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1 sm:gap-2">
                {[
                  { key: 'expense', label: t('addExpense'), color: 'bg-red-600 hover:bg-red-700' },
                  { key: 'income', label: t('addIncome'), color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { key: 'savings', label: t('addSavings'), color: 'bg-blue-600 hover:bg-blue-700' },
                  { key: 'investment', label: t('addInvestment'), color: 'bg-purple-600 hover:bg-purple-700' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    className={`${opt.color} text-white font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm`}
                    onClick={() => {
                      if (opt.key === 'income' || opt.key === 'expense') {
                        setAddModalType(opt.key);
                        setShowAddModal(true);
                      } else {
                        // TODO: open the appropriate add modal/form for savings and investment
                        alert(`Add ${opt.label} - coming soon`);
                      }
                    }}
                  >
                    + {opt.label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Transaction Edit Modal */}
      <TransactionEditModal
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        transactionType={addModalType}
        onTransactionAdded={() => {
          // Refresh the financial data context
          // The context will automatically refresh wallet data
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
