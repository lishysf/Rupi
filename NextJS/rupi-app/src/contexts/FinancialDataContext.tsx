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
  savings: any[];
  lastUpdated: {
    transactions: number;
    budgets: number;
    expenses: number;
    income: number;
    savings: number;
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
    expenses: [],
    income: [],
    savings: [],
    lastUpdated: {
      transactions: 0,
      budgets: 0,
      expenses: 0,
      income: 0,
      savings: 0,
    },
  },
  loading: {
    initial: true,
    transactions: false,
    budgets: false,
    expenses: false,
    income: false,
    savings: false,
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
  fetchSavings: () => Promise<void>;
  fetchTrends: (timeRange: string) => Promise<any>;
  // Transaction actions
  deleteTransaction: (id: number, type: 'income' | 'expense') => Promise<boolean>;
  updateTransaction: (id: number, type: 'income' | 'expense', data: any) => Promise<boolean>;
  // Budget actions
  saveBudget: (category: string, amount: number) => Promise<boolean>;
  deleteBudget: (category: string) => Promise<boolean>;
  // Refresh function
  refreshAll: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextType | null>(null);

// Provider component
export function FinancialDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(financialDataReducer, initialState);
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

  const fetchSavings = useCallback(async () => {
    try {
      const response = await fetch('/api/savings?limit=100');
      
      if (!response.ok) {
        throw new Error('Failed to fetch savings');
      }
      
      const data = await response.json();
      if (data.success) {
        dispatch({ type: 'SET_SAVINGS', payload: data.data || [] });
      }
    } catch (error) {
      console.error('Error fetching savings:', error);
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
        // Refresh budgets data
        await fetchBudgets();
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
        await fetchBudgets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Context: Error deleting budget:', error);
      return false;
    }
  }, [fetchBudgets]);

  // Transaction action functions
  const deleteTransaction = useCallback(async (id: number, type: 'income' | 'expense') => {
    try {
      const endpoint = type === 'expense' ? `/api/expenses/${id}` : `/api/income/${id}`;
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
        
        // Refresh all related data to keep all components in sync
        await Promise.all([
          fetchTransactions(),
          fetchExpenses(),
          fetchIncome(),
          fetchSavings()
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      return false;
    }
  }, [fetchTransactions, fetchExpenses, fetchIncome, fetchSavings]);

  const updateTransaction = useCallback(async (id: number, type: 'income' | 'expense', data: any) => {
    try {
      const endpoint = type === 'expense' ? `/api/expenses/${id}` : `/api/income/${id}`;
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
          type,
          category: type === 'expense' ? result.data.category : result.data.source
        };
        dispatch({ type: 'UPDATE_TRANSACTION', payload: updatedTransaction });
        
        // Refresh all related data to keep all components in sync
        await Promise.all([
          fetchTransactions(),
          fetchExpenses(),
          fetchIncome(),
          fetchSavings()
        ]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      return false;
    }
  }, [fetchTransactions, fetchExpenses, fetchIncome, fetchSavings]);

  // Refresh system
  const refreshAll = useCallback(async () => {
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    try {
      // Fetch all data silently without loading states
      await Promise.all([
        fetchTransactions(),
        fetchBudgets(),
        fetchExpenses(),
        fetchIncome(),
        fetchSavings()
      ]);
      
      dispatch({ type: 'REFRESH_ALL' });
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [fetchTransactions, fetchBudgets, fetchExpenses, fetchIncome, fetchSavings]);

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
  }, [refreshAll]);

  const contextValue: FinancialDataContextType = {
    state,
    dispatch,
    fetchTransactions,
    fetchBudgets,
    fetchExpenses,
    fetchIncome,
    fetchSavings,
    fetchTrends,
    deleteTransaction,
    updateTransaction,
    saveBudget,
    deleteBudget,
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
