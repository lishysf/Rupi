'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

// Types
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
  lastUpdated: {
    transactions: number;
    budgets: number;
    expenses: number;
    income: number;
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
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'REFRESH_ALL' };

// Initial state
const initialState: FinancialDataState = {
  data: {
    transactions: [],
    budgets: [],
    expenses: [],
    income: [],
    lastUpdated: {
      transactions: 0,
      budgets: 0,
      expenses: 0,
      income: 0,
    },
  },
  loading: {
    initial: true,
    transactions: false,
    budgets: false,
    expenses: false,
    income: false,
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
  fetchTransactions: () => Promise<void>;
  fetchBudgets: () => Promise<void>;
  fetchExpenses: () => Promise<void>;
  fetchIncome: () => Promise<void>;
  fetchTrends: (timeRange: string) => Promise<any>;
  // Actions
  saveBudget: (category: string, amount: number) => Promise<boolean>;
  deleteBudget: (category: string) => Promise<boolean>;
  // Auto-refresh controls
  enableAutoRefresh: () => void;
  disableAutoRefresh: () => void;
  refreshAll: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | null>(null);

// Provider component
export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financialDataReducer, initialState);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const isRefreshing = useRef(false);

  // Fetch functions
  const fetchTransactions = useCallback(async () => {
    try {
      const [expensesResponse, incomeResponse] = await Promise.all([
        fetch('/api/expenses?limit=50'),
        fetch('/api/income?limit=50')
      ]);

      if (!expensesResponse.ok || !incomeResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const [expensesData, incomeData] = await Promise.all([
        expensesResponse.json(),
        incomeResponse.json()
      ]);

      let allTransactions: Transaction[] = [];

      if (expensesData.success) {
        const expenseTransactions = expensesData.data.map((expense: any) => ({
          ...expense,
          type: 'expense' as const,
          category: expense.category
        }));
        allTransactions = [...allTransactions, ...expenseTransactions];
      }

      if (incomeData.success) {
        const incomeTransactions = incomeData.data.map((income: any) => ({
          ...income,
          type: 'income' as const,
          category: income.source
        }));
        allTransactions = [...allTransactions, ...incomeTransactions];
      }

      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      dispatch({ type: 'SET_TRANSACTIONS', payload: allTransactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_BUDGETS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch('/api/expenses?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_EXPENSES', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, []);

  const fetchIncome = useCallback(async () => {
    try {
      const response = await fetch('/api/income?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch income');
      }
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_INCOME', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching income:', error);
    }
  }, []);

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

      if (!response.ok) {
        throw new Error('Failed to save budget');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh budgets data
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving budget:', error);
      return false;
    }
  }, [fetchBudgets]);

  const deleteBudget = useCallback(async (category: string) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await fetch(`/api/budgets?category=${encodeURIComponent(category)}&month=${currentMonth}&year=${currentYear}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete budget');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh budgets data
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
  }, [fetchBudgets]);

  // Auto-refresh system
  const refreshAll = useCallback(async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    try {
      // Fetch all data silently without loading states
      await Promise.all([
        fetchTransactions(),
        fetchBudgets(),
        fetchExpenses(),
        fetchIncome()
      ]);
      
      dispatch({ type: 'REFRESH_ALL' });
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [fetchTransactions, fetchBudgets, fetchExpenses, fetchIncome]);

  const enableAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) return;
    
    // Refresh every 30 seconds
    autoRefreshInterval.current = setInterval(() => {
      refreshAll();
    }, 30000);
  }, [refreshAll]);

  const disableAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: true } });
      
      try {
        await refreshAll();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
      }
    };

    loadInitialData();
    enableAutoRefresh();

    return () => {
      disableAutoRefresh();
    };
  }, [refreshAll, enableAutoRefresh, disableAutoRefresh]);

  const contextValue: FinancialDataContextType = {
    state,
    dispatch,
    fetchTransactions,
    fetchBudgets,
    fetchExpenses,
    fetchIncome,
    fetchTrends,
    saveBudget,
    deleteBudget,
    enableAutoRefresh,
    disableAutoRefresh,
    refreshAll,
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
