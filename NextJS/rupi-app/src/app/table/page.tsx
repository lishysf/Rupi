'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// Define constants locally to avoid importing server-side modules in client component
const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Gifts & Donations',
  'Other'
];

const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Rental',
  'Gift',
  'Other'
];
import Sidebar from '@/app/components/Sidebar';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';
import TransactionEditModal from '@/app/components/TransactionEditModal';

function FinancialTable() {
  const { state, fetchTransactions, deleteTransaction, updateTransaction } = useFinancialData();
  
  // Debug logging
  console.log('FinancialTable state:', state);
  console.log('Transactions:', state.data.transactions);
  console.log('Loading states:', state.loading);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingType, setEditingType] = useState<'income' | 'expense' | 'savings' | 'investment' | null>(null);
  const [editDraft, setEditDraft] = useState<{ description: string; amount: number; category: string; date: string } | null>(null);
  const [globalEditMode, setGlobalEditMode] = useState<boolean>(false);
  const [globalEditData, setGlobalEditData] = useState<Record<string, { description: string; amount: number; category: string; date: string; type: string }>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Defaults to current month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [selectedDay, setSelectedDay] = useState<string>(''); // '' means all days, otherwise 1..31
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  useEffect(() => {
    fetchTransactions(true); // Show loading state
  }, [fetchTransactions]);

  const handleEdit = (tx: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number}) => setSelectedTx(tx);
  const startInlineEdit = (tx: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number}) => {
    setEditingId(tx.id);
    setEditingType(tx.type as 'income' | 'expense' | 'savings' | 'investment');
    // Normalize date to YYYY-MM-DD for input value
    const d = new Date(tx.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setEditDraft({
      description: tx.description || '',
      amount: Number(tx.amount) || 0,
      category: tx.category || '',
      date: `${yyyy}-${mm}-${dd}`,
    });
  };
  const handleClose = () => setSelectedTx(null);

  const handleDelete = async (tx: {id: number, type: string, description: string, amount: number | string, date: string, category?: string, source?: string, wallet_id?: number}) => {
    if (deletingId === tx.id) return;
    
    setDeletingId(tx.id);
    try {
      const type = tx.type === 'income' ? 'income' : 'expense';
      await deleteTransaction(tx.id, type);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setEditDraft(null);
  };

  const saveInlineEdit = async () => {
    if (editingId == null || !editingType || !editDraft) return;
    // Only income/expense updates are supported by current APIs
    const apiType: 'income' | 'expense' = editingType === 'income' ? 'income' : 'expense';
    const payload: {description: string, amount: number, category?: string, source?: string, wallet_id?: number, date: string} = {
      description: editDraft.description,
      amount: Number(editDraft.amount),
      date: editDraft.date,
    };
    if (apiType === 'income') {
      payload.source = editDraft.category;
    } else {
      payload.category = editDraft.category;
    }
    const ok = await updateTransaction(editingId, apiType, payload);
    if (ok) {
      cancelInlineEdit();
    }
  };

  const startGlobalEdit = () => {
    const editData: Record<string, { description: string; amount: number; category: string; date: string; type: string }> = {};
    filteredRows.forEach((tx) => {
      if (tx.type === 'income' || tx.type === 'expense') {
        const d = new Date(tx.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        editData[String(tx.id)] = {
          description: tx.description || '',
          amount: Number(tx.amount) || 0,
          category: tx.category || '',
          date: `${yyyy}-${mm}-${dd}`,
          type: tx.type,
        };
      }
    });
    setGlobalEditData(editData);
    setGlobalEditMode(true);
  };

  const cancelGlobalEdit = () => {
    setGlobalEditMode(false);
    setGlobalEditData({});
  };

  const updateGlobalEditData = (id: string | number, field: string, value: string | number) => {
    setGlobalEditData(prev => ({
      ...prev,
      [String(id)]: {
        ...prev[String(id)],
        [field]: value,
      },
    }));
  };

  const saveAllChanges = async () => {
    const promises = Object.entries(globalEditData).map(async ([id, data]) => {
      const apiType: 'income' | 'expense' = data.type === 'income' ? 'income' : 'expense';
      const payload: {description: string, amount: number, category?: string, source?: string, wallet_id?: number, date: string} = {
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
      };
      if (apiType === 'income') {
        payload.source = data.category;
      } else {
        payload.category = data.category;
      }
      return updateTransaction(id, apiType, payload);
    });

    const results = await Promise.all(promises);
    const allSuccess = results.every(result => result === true);
    
    if (allSuccess) {
      cancelGlobalEdit();
    }
  };

  // Derived rows with filters
  const filteredRows = useMemo(() => {
    let results = state.data.transactions;
    // Exclude investments from table entirely
    results = results.filter((tx) => String(tx.type || '').toLowerCase().trim() !== 'investment');
    if (selectedType !== 'all') {
      const normType = String(selectedType).toLowerCase();
      results = results.filter((tx) => String(tx.type || '').toLowerCase().trim() === normType);
    }
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map((v) => parseInt(v, 10));
      results = results.filter((tx) => {
        const d = new Date(tx.date);
        const inMonth = d.getFullYear() === y && d.getMonth() + 1 === m;
        if (!inMonth) return false;
        if (selectedDay) {
          const dayNum = parseInt(selectedDay, 10);
          return d.getDate() === dayNum;
        }
        return true;
      });
    }
    return results;
  }, [state.data.transactions, selectedType, selectedMonth, selectedDay]);

  // Helper function to get wallet name by ID
  const getWalletName = (walletId?: number) => {
    if (!walletId) return 'N/A';
    const wallet = state.data.wallets.find((w: {id: number, name: string, type: string, balance: number, color: string, icon: string, is_active: boolean}) => w.id === walletId);
    return wallet ? wallet.name : 'Unknown';
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedType, selectedMonth, selectedDay, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  
  

  // Show loading state if data is being fetched
  if (state.loading.transactions) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Table</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading transactions...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-500 dark:text-neutral-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (state.error) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Table</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Error loading data</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500 dark:text-red-400">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Table</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Edit your financial data</p>
        </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Day (optional)</label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="">All days</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="savings">Savings</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Rows per page</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {!globalEditMode ? (
            <>
              <button
                onClick={startGlobalEdit}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Edit All
              </button>
              <button
                onClick={() => {
                  const rows = filteredRows.map((tx) => ({
                    date: new Date(tx.date).toISOString().slice(0, 10),
                    type: tx.type,
                    description: tx.description,
                    amount: tx.amount,
                    category: tx.category,
                  }));
                  const headers = ['date','type','description','amount','category'];
                  const sep = ';';
                  const bom = '\ufeff';
                  const csvLines = [headers.join(sep), ...rows.map(r => headers.map(h => {
                    const val = (r as any)[h] ?? '';
                    const s = String(val).replace(/"/g, '""');
                    return `"${s}"`;
                  }).join(sep))];
                  const csv = bom + csvLines.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const namePart = selectedType === 'all' ? 'all' : selectedType;
                  const monthPart = selectedMonth ? `_${selectedMonth}` : '';
                  a.href = url;
                  a.download = `fundy_${namePart}${monthPart}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm"
              >
                Export CSV
              </button>
            </>
          ) : (
            <>
              <button
                onClick={saveAllChanges}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
              >
                Save All
              </button>
              <button
                onClick={cancelGlobalEdit}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm"
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <tr>
              <th className="text-center px-4 py-3 font-medium">Date (Tanggal)</th>
              <th className="text-center px-4 py-3 font-medium">Time</th>
              <th className="text-center px-4 py-3 font-medium">Type</th>
              <th className="text-center px-4 py-3 font-medium">Description</th>
              <th className="text-center px-4 py-3 font-medium">Amount</th>
              <th className="text-center px-4 py-3 font-medium">Category/Source</th>
              <th className="text-center px-4 py-3 font-medium">Wallet</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((tx) => (
              <tr key={`${tx.type}-${tx.id}`} className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60">
                {globalEditMode && (tx.type === 'income' || tx.type === 'expense') ? (
                  <>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="date"
                        value={globalEditData[String(tx.id)]?.date || ''}
                        onChange={(e) => updateGlobalEditData(tx.id, 'date', e.target.value)}
                        className="px-2 py-1.5 w-full border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-4 py-2 text-center text-neutral-700 dark:text-neutral-200">
                      {new Date(tx.created_at || tx.updated_at || tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <select
                        value={globalEditData[String(tx.id)]?.type || tx.type}
                        disabled
                        onChange={() => {}}
                        className="px-2 py-1.5 w-full border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-500"
                      >
                        <option value="income">income</option>
                        <option value="expense">expense</option>
                        <option value="savings">savings</option>
                        <option value="investment">investment</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={globalEditData[String(tx.id)]?.description || ''}
                        onChange={(e) => updateGlobalEditData(tx.id, 'description', e.target.value)}
                        className="px-2 py-1.5 w-full border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        value={globalEditData[String(tx.id)]?.amount ?? 0}
                        onChange={(e) => updateGlobalEditData(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="px-2 py-1.5 w-32 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-center"
                        min={0}
                        step={1000}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {(globalEditData[String(tx.id)]?.type === 'income' || tx.type === 'income') ? (
                        <select
                          value={globalEditData[String(tx.id)]?.category || ''}
                          onChange={(e) => updateGlobalEditData(tx.id, 'category', e.target.value)}
                          className="px-2 py-1.5 w-full border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        >
                          <option value="">Select source...</option>
                          {INCOME_SOURCES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={globalEditData[String(tx.id)]?.category || ''}
                          onChange={(e) => updateGlobalEditData(tx.id, 'category', e.target.value)}
                          className="px-2 py-1.5 w-full border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        >
                          <option value="">Select category...</option>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-neutral-700 dark:text-neutral-200">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getWalletName(tx.wallet_id) === 'N/A' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {getWalletName(tx.wallet_id)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleDelete(tx)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200">{new Date(tx.created_at || tx.updated_at || tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : tx.type === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : tx.type === 'savings' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                    	{tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200">{tx.description}</td>
                    <td className="px-4 py-3 text-center text-neutral-900 dark:text-neutral-100">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200">{tx.category}</td>
                    <td className="px-4 py-3 text-center text-neutral-700 dark:text-neutral-200">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getWalletName(tx.wallet_id) === 'N/A' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {getWalletName(tx.wallet_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(tx)}
                        disabled={deletingId === tx.id}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deletingId === tx.id ? (
                          <>
                            <div className="w-3 h-3 animate-spin border border-white border-t-transparent rounded-full"></div>
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TransactionEditModal
        transaction={selectedTx}
        isOpen={!!selectedTx}
        onClose={handleClose}
        onSave={updateTransaction}
      />

      {/* Footer pagination (duplicate for convenience on long lists) */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function TablePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return null;
  }
  if (!session) return null;

  return (
    <FinancialDataProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar currentPage="Table" />
        <div className="flex-1 lg:ml-64">
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <FinancialTable />
          </main>
        </div>
      </div>
    </FinancialDataProvider>
  );
}


