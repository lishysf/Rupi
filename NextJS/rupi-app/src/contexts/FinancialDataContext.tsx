'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Types
interface Transaction {
  id: string | number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  type: 'income' | 'expense' | 'savings';
  wallet_id?: number;
}

interface Budget {
  id?: number;
  category: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
}

interface FinancialData {
  transactions: Transaction[];
  budgets: Budget[];
  expenses: any[];
  income: any[];
  savings: any[];
  investments: any[];
  wallets: any[];
  lastUpdated: {
    transactions: number;
    budgets: number;
    expenses: number;
    income: number;
    savings: number;
    investments: number;
    wallets: number;
  };
}

interface FinancialDataState {
  data: FinancialData;
  loading: {
    initial: boolean;
    transactions: boolean;
    budgets: boolean;
    expenses: boolean;
    income: boolean;
    savings: boolean;
    investments: boolean;
    wallets: boolean;
  };
  error: string | null;
}

// Actions
type FinancialDataAction = 
  | { type: 'SET_LOADING'; payload: { key: keyof FinancialDataState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_BUDGETS'; payload: Budget[] }
  | { type: 'SET_EXPENSES'; payload: any[] }
  | { type: 'SET_INCOME'; payload: any[] }
  | { type: 'SET_SAVINGS'; payload: any[] }
  | { type: 'SET_INVESTMENTS'; payload: any[] }
  | { type: 'SET_WALLETS'; payload: any[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string | number }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'REFRESH_ALL' };

// Initial state without caching
const initialState: FinancialDataState = {
  data: {
    transactions: [],
    budgets: [],
    expenses: [],
    income: [],
    savings: [],
    investments: [],
    wallets: [],
    lastUpdated: {
      transactions: 0,
      budgets: 0,
      expenses: 0,
      income: 0,
      savings: 0,
      investments: 0,
      wallets: 0,
    },
  },
  loading: {
    initial: true, // Show initial loading since we're not using cache
    transactions: false,
    budgets: false,
    expenses: false,
    income: false,
    savings: false,
    investments: false,
    wallets: false,
  },
  error: null,
};

// Reducer
function financialDataReducer(state: FinancialDataState, action: FinancialDataAction): FinancialDataState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_TRANSACTIONS':
      return {
        ...state,
        data: {
          ...state.data,
          transactions: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            transactions: Date.now(),
          },
        },
      };

    case 'SET_BUDGETS':
      return {
        ...state,
        data: {
          ...state.data,
          budgets: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            budgets: Date.now(),
          },
        },
      };

    case 'SET_EXPENSES':
      return {
        ...state,
        data: {
          ...state.data,
          expenses: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            expenses: Date.now(),
          },
        },
      };

    case 'SET_INCOME':
      return {
        ...state,
        data: {
          ...state.data,
          income: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            income: Date.now(),
          },
        },
      };

    case 'SET_SAVINGS':
      return {
        ...state,
        data: {
          ...state.data,
          savings: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            savings: Date.now(),
          },
        },
      };

    case 'SET_INVESTMENTS':
      return {
        ...state,
        data: {
          ...state.data,
          investments: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            investments: Date.now(),
          },
        },
      };

    case 'SET_WALLETS':
      return {
        ...state,
        data: {
          ...state.data,
          wallets: action.payload,
          lastUpdated: {
            ...state.data.lastUpdated,
            wallets: Date.now(),
          },
        },
      };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        data: {
          ...state.data,
          transactions: [action.payload, ...state.data.transactions],
          lastUpdated: {
            ...state.data.lastUpdated,
            transactions: Date.now(),
          },
        },
      };

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        data: {
          ...state.data,
          transactions: state.data.transactions.map(transaction => 
            transaction.id === action.payload.id ? action.payload : transaction
          ),
          lastUpdated: {
            ...state.data.lastUpdated,
            transactions: Date.now(),
          },
        },
      };

    case 'DELETE_TRANSACTION':
      return {
        ...state,
        data: {
          ...state.data,
          transactions: state.data.transactions.filter(transaction => transaction.id !== action.payload),
          lastUpdated: {
            ...state.data.lastUpdated,
            transactions: Date.now(),
          },
        },
      };

    case 'ADD_BUDGET':
      return {
        ...state,
        data: {
          ...state.data,
          budgets: [...state.data.budgets, action.payload],
          lastUpdated: {
            ...state.data.lastUpdated,
            budgets: Date.now(),
          },
        },
      };

    case 'UPDATE_BUDGET':
      return {
        ...state,
        data: {
          ...state.data,
          budgets: state.data.budgets.map(budget => 
            budget.category === action.payload.category ? action.payload : budget
          ),
          lastUpdated: {
            ...state.data.lastUpdated,
            budgets: Date.now(),
          },
        },
      };

    case 'DELETE_BUDGET':
      return {
        ...state,
        data: {
          ...state.data,
          budgets: state.data.budgets.filter(budget => budget.category !== action.payload),
          lastUpdated: {
            ...state.data.lastUpdated,
            budgets: Date.now(),
          },
        },
      };

    case 'REFRESH_ALL':
      return {
        ...state,
        data: {
          ...state.data,
          lastUpdated: {
            transactions: Date.now(),
            budgets: Date.now(),
            expenses: Date.now(),
            income: Date.now(),
            savings: Date.now(),
            investments: Date.now(),
            wallets: Date.now(),
          },
        },
      };

    default:
      return state;
  }
}

// Context
interface FinancialDataContextType {
  state: FinancialDataState;
  dispatch: React.Dispatch<FinancialDataAction>;
  // Data fetchers
  fetchTransactions: (showLoading?: boolean) => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchExpenses: () => Promise<void>;
  fetchIncome: () => Promise<void>;
  fetchSavings: () => Promise<void>;
  fetchInvestments: () => Promise<void>;
  fetchWallets: () => Promise<void>;
  fetchTrends: (timeRange: string) => Promise<any>;
  // Transaction actions
  deleteTransaction: (id: string | number, type: 'income' | 'expense') => Promise<boolean>;
  updateTransaction: (id: string | number, type: 'income' | 'expense', data: any) => Promise<boolean>;
  // Savings actions
  deleteSavings: (id: number) => Promise<boolean>;
  updateSavings: (id: number, data: { description?: string; amount?: number; goalName?: string }) => Promise<boolean>;
  // Investment actions
  deleteInvestment: (id: number) => Promise<boolean>;
  updateInvestment: (id: number, data: { description?: string; amount?: number; assetName?: string }) => Promise<boolean>;
  // Budget actions
  saveBudget: (category: string, amount: number) => Promise<boolean>;
  deleteBudget: (category: string) => Promise<boolean>;
  // Refresh function
  refreshAll: () => Promise<void>;
  // Transaction refresh function
  refreshAfterTransaction: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | null>(null);

// Provider component
export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financialDataReducer, initialState);
  const isRefreshing = useRef(false);
  const { data: session, status } = useSession();

  // Helper function for retry logic
  const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }
        
        // If it's the last attempt or a client error (4xx), throw
        if (attempt === maxRetries || (response.status >= 400 && response.status < 500)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Fetch functions with retry logic - no loading states for smooth updates
  const fetchTransactions = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: true } });
      }
      
      const [expensesResponse, incomeResponse, savingsResponse] = await Promise.all([
        fetchWithRetry('/api/expenses?limit=50'),
        fetchWithRetry('/api/income?limit=50'),
        fetchWithRetry('/api/savings?limit=50')
      ]);

      const [expensesData, incomeData, savingsData] = await Promise.all([
        expensesResponse.json(),
        incomeResponse.json(),
        savingsResponse.json()
      ]);

      let allTransactions: Transaction[] = [];

      if (expensesData.success) {
        const expenseTransactions = expensesData.data.map((expense: any) => ({
          ...expense,
          id: `expense-${expense.id}`, // Make ID unique by prefixing type
          type: 'expense' as const,
          category: expense.category,
          wallet_id: expense.wallet_id // Preserve wallet information
        }));
        allTransactions = [...allTransactions, ...expenseTransactions];
      }

      if (incomeData.success) {
        const incomeTransactions = incomeData.data.map((income: any) => ({
          ...income,
          id: `income-${income.id}`, // Make ID unique by prefixing type
          type: 'income' as const,
          category: income.source,
          wallet_id: income.wallet_id // Preserve wallet information
        }));
        allTransactions = [...allTransactions, ...incomeTransactions];
      }

      if (savingsData.success) {
        const savingsTransactions = savingsData.data.map((saving: any) => ({
          ...saving,
          id: `savings-${saving.id}`, // Make ID unique by prefixing type
          type: 'savings' as const,
          category: saving.goal_name || 'Savings', // Use goal_name as category
          wallet_id: saving.wallet_id // Preserve wallet information
        }));
        allTransactions = [...allTransactions, ...savingsTransactions];
      }

      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      dispatch({ type: 'SET_TRANSACTIONS', payload: allTransactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load transactions' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: false } });
      }
    }
  }, [session]);

  const fetchBudgets = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    // Check if we have recent budget data (within last 2 minutes) to avoid unnecessary requests
    const now = Date.now();
    const lastUpdated = state.data.lastUpdated.budgets;
    const isRecent = (now - lastUpdated) < 2 * 60 * 1000; // 2 minutes
    
    if (isRecent && state.data.budgets.length > 0 && !showLoading) {
      console.log('Using cached budget data');
      return;
    }
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'budgets', value: true } });
      }
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await fetchWithRetry(`/api/budgets?month=${currentMonth}&year=${currentYear}`);
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_BUDGETS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load budgets' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'budgets', value: false } });
      }
    }
  }, [session, state.data.lastUpdated.budgets]);

  const fetchExpenses = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'expenses', value: true } });
      }
      
      const response = await fetchWithRetry('/api/expenses?limit=100');
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_EXPENSES', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load expenses' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'expenses', value: false } });
      }
    }
  }, [session]);

  const fetchIncome = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'income', value: true } });
      }
      
      const response = await fetchWithRetry('/api/income?limit=100');
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_INCOME', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching income:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load income' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'income', value: false } });
      }
    }
  }, [session]);

  const fetchSavings = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'savings', value: true } });
      }
      
      const response = await fetchWithRetry('/api/savings?limit=100');
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_SAVINGS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching savings:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load savings' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'savings', value: false } });
      }
    }
  }, [session]);

  const fetchInvestments = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'investments', value: true } });
      }
      
      const response = await fetchWithRetry('/api/investments?limit=100');
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_INVESTMENTS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load investments' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'investments', value: false } });
      }
    }
  }, [session]);

  const fetchWallets = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'wallets', value: true } });
      }
      
      const response = await fetchWithRetry('/api/wallets');
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_WALLETS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load wallets' });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'wallets', value: false } });
      }
    }
  }, [session]);

  const fetchTrends = useCallback(async (timeRange: string) => {
    try {
      const response = await fetch(`/api/expenses/trends?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching trends:', error);
      return [];
    }
  }, []);

  // Action functions
  const saveBudget = useCallback(async (category: string, amount: number) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      console.log('Context: Saving budget:', { category, amount, month: currentMonth, year: currentYear });
      
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          amount,
          month: currentMonth,
          year: currentYear
        }),
      });

      console.log('Context: Budget API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Context: Budget API error response:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Context: Budget API error response (text):', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Context: Could not parse error response:', textError);
          }
        }
        throw new Error(`Failed to save budget: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Context: Budget API success response:', data);
      
      if (data.success) {
        // Update budget in local state immediately for instant UI feedback
        const updatedBudget = {
          ...data.data,
          spent: 0 // Will be updated when we refresh
        };
        dispatch({ type: 'UPDATE_BUDGET', payload: updatedBudget });
        
        // Refresh budgets data in background to get accurate spending
        setTimeout(() => fetchBudgets(false), 100);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Context: Error saving budget:', error);
      return false;
    }
  }, [fetchBudgets]);

  const deleteBudget = useCallback(async (category: string) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      console.log('Context: Deleting budget:', { category, month: currentMonth, year: currentYear });
      
      const response = await fetch(`/api/budgets?category=${encodeURIComponent(category)}&month=${currentMonth}&year=${currentYear}`, {
        method: 'DELETE',
      });

      console.log('Context: Delete budget API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Context: Delete budget API error response:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            console.error('Context: Delete budget API error response (text):', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Context: Could not parse delete error response:', textError);
          }
        }
        throw new Error(`Failed to delete budget: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('Context: Delete budget API success response:', data);
      
      if (data.success) {
        // Refresh budgets data
        await fetchBudgets(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Context: Error deleting budget:', error);
      return false;
    }
  }, [fetchBudgets]);

  // Transaction action functions
  const deleteTransaction = useCallback(async (id: string | number, type: 'income' | 'expense') => {
    try {
      // Extract original ID from prefixed ID
      const originalId = typeof id === 'string' ? id.split('-')[1] : id;
      const endpoint = type === 'expense' ? `/api/expenses/${originalId}` : `/api/income/${originalId}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update local state immediately
        dispatch({ type: 'DELETE_TRANSACTION', payload: id });
        
        // Refresh all related data to keep all components in sync (no loading states)
        await Promise.all([
          fetchTransactions(false),
          fetchExpenses(false),
          fetchIncome(false),
          fetchSavings(false),
          fetchInvestments(false),
          fetchWallets(false)
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      return false;
    }
  }, [fetchTransactions, fetchExpenses, fetchIncome, fetchSavings]);

  const updateTransaction = useCallback(async (id: string | number, type: 'income' | 'expense', data: any) => {
    try {
      // Extract original ID from prefixed ID
      const originalId = typeof id === 'string' ? id.split('-')[1] : id;
      const endpoint = type === 'expense' ? `/api/expenses/${originalId}` : `/api/income/${originalId}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${type}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update local state immediately
        const updatedTransaction = {
          ...result.data,
          id: `${type}-${result.data.id}`, // Use prefixed ID
          type,
          category: type === 'expense' ? result.data.category : result.data.source
        };
        dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTransaction });
        
        // Refresh all related data to keep all components in sync (no loading states)
        await Promise.all([
          fetchTransactions(false),
          fetchExpenses(false),
          fetchIncome(false),
          fetchSavings(false),
          fetchInvestments(false),
          fetchWallets(false)
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      return false;
    }
  }, [fetchTransactions, fetchExpenses, fetchIncome, fetchSavings]);

  // Savings action functions
  const deleteSavings = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/savings/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete savings');
      }
      const data = await response.json();
      if (data.success) {
        await fetchSavings(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting savings:', error);
      return false;
    }
  }, [fetchSavings]);

  const updateSavings = useCallback(async (id: number, data: { description?: string; amount?: number; goalName?: string }) => {
    try {
      const response = await fetch(`/api/savings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update savings');
      }
      const result = await response.json();
      if (result.success) {
        await fetchSavings(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating savings:', error);
      return false;
    }
  }, [fetchSavings]);

  const deleteInvestment = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete investment');
      const data = await response.json();
      if (data.success) {
        await fetchInvestments(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting investment:', error);
      return false;
    }
  }, [fetchInvestments]);

  const updateInvestment = useCallback(async (id: number, data: { description?: string; amount?: number; assetName?: string }) => {
    try {
      const response = await fetch(`/api/investments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update investment');
      const result = await response.json();
      if (result.success) {
        await fetchInvestments(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating investment:', error);
      return false;
    }
  }, [fetchInvestments]);

  // Refresh system
  const refreshAll = useCallback(async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    try {
      // Fetch all data silently without loading states for smooth background updates
      await Promise.all([
        fetchTransactions(false), // No loading states for background refresh
        fetchBudgets(false),
        fetchExpenses(false),
        fetchIncome(false),
        fetchSavings(false),
        fetchInvestments(false),
        fetchWallets(false)
      ]);
      
      dispatch({ type: 'REFRESH_ALL' });
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh function specifically for after adding transactions
  const refreshAfterTransaction = useCallback(async () => {
    try {
      // Refresh all data including wallets and savings to show updated balances
      await Promise.all([
        fetchTransactions(false),
        fetchExpenses(false),
        fetchIncome(false),
        fetchSavings(false),
        fetchWallets(false)
      ]);
    } catch (error) {
      console.error('Error refreshing after transaction:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial data load with progressive loading
  useEffect(() => {
    if (status === 'loading') return; // Still loading session
    
    const loadInitialData = async () => {
      if (!session) {
        // Clear data if user is not authenticated
        dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
        dispatch({ type: 'SET_BUDGETS', payload: [] });
        dispatch({ type: 'SET_EXPENSES', payload: [] });
        dispatch({ type: 'SET_INCOME', payload: [] });
        dispatch({ type: 'SET_SAVINGS', payload: [] });
        dispatch({ type: 'SET_INVESTMENTS', payload: [] });
        dispatch({ type: 'SET_WALLETS', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
        return;
      }
      
      // Always show dashboard immediately - no initial loading state
      
      try {
        // Prioritize budget data for faster loading
        await Promise.all([
          fetchBudgets(true), // Load budgets first for immediate display
          fetchWallets(true), // Load wallets for balance calculations
        ]);
        
        // Load other data in background
        await Promise.all([
          fetchTransactions(false), // No loading state for background
          fetchExpenses(false),
          fetchIncome(false),
          fetchSavings(false),
          fetchInvestments(false)
        ]);
        
        // Clear initial loading state after successful data load
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load financial data' });
        // Clear initial loading state even on error
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
      }
    };

    loadInitialData();
  }, [session, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background refresh every 5 minutes
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      // Silently refresh data in background
      refreshAll();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps


  const contextValue: FinancialDataContextType = {
    state,
    dispatch,
    fetchTransactions,
    fetchBudgets,
    fetchExpenses,
    fetchIncome,
    fetchSavings,
    fetchInvestments,
    fetchWallets,
    fetchTrends,
    deleteTransaction,
    updateTransaction,
    deleteInvestment,
    updateInvestment,
    deleteSavings,
    updateSavings,
    saveBudget,
    deleteBudget,
    refreshAll,
    refreshAfterTransaction,
  };

  return (
    <FinancialDataContext.Provider value={contextValue}>
      {children}
    </FinancialDataContext.Provider>
  );
}

// Hook to use the context
export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}
