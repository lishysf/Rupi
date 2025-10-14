'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Types for unified transaction system
interface Transaction {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'savings' | 'investment';
  category?: string;
  source?: string;
  wallet_id?: number;
  goal_name?: string;
  asset_name?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface Budget {
  id?: number;
  category: string;
  budget: number;
  spent: number;
  month: number;
  year: number;
}

interface UserWallet {
  id: number;
  user_id: number;
  name: string;
  type: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface FinancialData {
  transactions: Transaction[];
  budgets: Budget[];
  wallets: UserWallet[];
  lastUpdated: {
    transactions: number;
    budgets: number;
    wallets: number;
  };
}

interface FinancialDataState {
  data: FinancialData;
  loading: {
    initial: boolean;
    transactions: boolean;
    budgets: boolean;
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
  | { type: 'SET_WALLETS'; payload: UserWallet[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: number }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'REFRESH_ALL' };

// Initial state
const initialState: FinancialDataState = {
  data: {
    transactions: [],
    budgets: [],
    wallets: [],
    lastUpdated: {
      transactions: 0,
      budgets: 0,
      wallets: 0,
    },
  },
  loading: {
    initial: true,
    transactions: false,
    budgets: false,
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
  fetchWallets: () => Promise<void>;
  fetchTrends: (timeRange: string) => Promise<any>;
  // Transaction actions
  deleteTransaction: (id: number) => Promise<boolean>;
  updateTransaction: (id: number, data: any) => Promise<boolean>;
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
        
        if (attempt === maxRetries || (response.status >= 400 && response.status < 500)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Fetch transactions from unified system
  const fetchTransactions = useCallback(async (showLoading = false) => {
    if (!session) return;
    
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: true } });
      }
      
      const response = await fetchWithRetry('/api/transactions?limit=100');
      const data = await response.json();

      if (data.success) {
        dispatch({ type: 'SET_TRANSACTIONS', payload: data.data || [] });
      }
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
      const response = await fetch(`/api/transactions/trends?range=${timeRange}`);
      
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
        const updatedBudget = {
          ...data.data,
          spent: 0
        };
        dispatch({ type: 'UPDATE_BUDGET', payload: updatedBudget });
        
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
  const deleteTransaction = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'DELETE_TRANSACTION', payload: id });
        
        await Promise.all([
          fetchTransactions(false),
          fetchWallets(false)
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }, [fetchTransactions, fetchWallets]);

  const updateTransaction = useCallback(async (id: number, data: any) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      const result = await response.json();
      if (result.success) {
        dispatch({ type: 'UPDATE_TRANSACTION', payload: result.data });
        
        await Promise.all([
          fetchTransactions(false),
          fetchWallets(false)
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  }, [fetchTransactions, fetchWallets]);

  // Refresh system
  const refreshAll = useCallback(async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    try {
      await Promise.all([
        fetchTransactions(false),
        fetchBudgets(false),
        fetchWallets(false)
      ]);
      
      dispatch({ type: 'REFRESH_ALL' });
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [fetchTransactions, fetchBudgets, fetchWallets]);

  const refreshAfterTransaction = useCallback(async () => {
    try {
      await Promise.all([
        fetchTransactions(false),
        fetchWallets(false)
      ]);
    } catch (error) {
      console.error('Error refreshing after transaction:', error);
    }
  }, [fetchTransactions, fetchWallets]);

  // Initial data load
  useEffect(() => {
    if (status === 'loading') return;
    
    const loadInitialData = async () => {
      if (!session) {
        dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
        dispatch({ type: 'SET_BUDGETS', payload: [] });
        dispatch({ type: 'SET_WALLETS', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
        return;
      }
      
      try {
        await Promise.all([
          fetchBudgets(true),
          fetchWallets(true),
        ]);
        
        await Promise.all([
          fetchTransactions(false),
        ]);
        
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load financial data' });
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
      }
    };

    loadInitialData();
  }, [session, status, fetchTransactions, fetchBudgets, fetchWallets]);

  // Background refresh every 5 minutes
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      refreshAll();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session, refreshAll]);

  const contextValue: FinancialDataContextType = {
    state,
    dispatch,
    fetchTransactions,
    fetchBudgets,
    fetchWallets,
    fetchTrends,
    deleteTransaction,
    updateTransaction,
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
