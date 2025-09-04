'use client';

import { useMemo } from 'react';
import { Heart, TrendingUp, Activity, PiggyBank } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  savingsRate: number;
}

interface FinancialHealthScoreProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function FinancialHealthScore({ widgetSize = 'square' }: FinancialHealthScoreProps) {
  const { state } = useFinancialData();
  const { expenses, income } = state.data;
  const loading = state.loading.initial && expenses.length === 0 && income.length === 0;

  // Calculate financial data from context
  const financialData: FinancialData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncome = income.reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0);

    // Filter for current month
    const currentMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const currentMonthIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd;
      })
      .reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0);

    // Filter for previous month
    const previousMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= previousMonthStart && expenseDate <= previousMonthEnd;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    const savingsRate = currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      currentMonthIncome,
      currentMonthExpenses,
      previousMonthExpenses,
      savingsRate
    };
  }, [expenses, income]);

  // Calculate health score based on real data
  const calculateHealthScore = () => {
    let score = 0;
    
    // Factor 1: Savings Rate (40% of total score)
    const savingsRate = financialData.savingsRate;
    if (savingsRate >= 20) score += 40;
    else if (savingsRate >= 10) score += 30;
    else if (savingsRate >= 5) score += 20;
    else if (savingsRate >= 0) score += 10;
    
    // Factor 2: Expense Control - spending less than previous month (30% of total score)
    const expenseControl = financialData.previousMonthExpenses > 0 
      ? Math.max(0, (financialData.previousMonthExpenses - financialData.currentMonthExpenses) / financialData.previousMonthExpenses * 100)
      : 0;
    if (expenseControl >= 10) score += 30;
    else if (expenseControl >= 0) score += 20;
    else if (expenseControl >= -10) score += 10;
    
    // Factor 3: Income vs Expenses Ratio (30% of total score)
    const incomeExpenseRatio = financialData.currentMonthIncome > 0 
      ? (financialData.currentMonthIncome / (financialData.currentMonthExpenses || 1))
      : 0;
    if (incomeExpenseRatio >= 2) score += 30;
    else if (incomeExpenseRatio >= 1.5) score += 25;
    else if (incomeExpenseRatio >= 1.2) score += 20;
    else if (incomeExpenseRatio >= 1) score += 15;
    else if (incomeExpenseRatio >= 0.8) score += 10;
    
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const healthScore = calculateHealthScore();
  
  // Calculate previous month score for comparison (based on previous month data)
  const calculatePreviousScore = () => {
    if (financialData.previousMonthExpenses === 0) return Math.max(0, healthScore - 5);
    
    // Compare current vs previous month spending
    const spendingChange = financialData.currentMonthExpenses - financialData.previousMonthExpenses;
    if (spendingChange < 0) return Math.max(0, healthScore - 5); // Improved (spending less)
    else if (spendingChange > 0) return Math.min(100, healthScore + 5); // Worsened (spending more)
    return healthScore; // Same
  };
  
  const previousScore = calculatePreviousScore();
  const scoreChange = healthScore - previousScore;

  // Calculate individual factor scores
  const factors = [
    { 
      name: 'Savings', 
      score: Math.min(100, Math.max(0, Math.round(financialData.savingsRate * 2))), 
      icon: PiggyBank 
    },
    { 
      name: 'Budget', 
      score: financialData.currentMonthIncome > 0 
        ? Math.min(100, Math.max(0, 100 - Math.round((financialData.currentMonthExpenses / financialData.currentMonthIncome) * 50)))
        : 0, 
      icon: Activity 
    },
    { 
      name: 'Consistency', 
      score: financialData.previousMonthExpenses > 0 
        ? Math.min(100, Math.max(0, 100 - Math.abs(Math.round(((financialData.currentMonthExpenses - financialData.previousMonthExpenses) / financialData.previousMonthExpenses) * 100))))
        : 50, 
      icon: TrendingUp 
    },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center mb-4 flex-shrink-0">
          <Heart className="w-5 h-5 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Financial Health
          </h2>
        </div>
        <div className="flex-1 animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="space-y-2">
              <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // Mascot expressions based on score
  const getMascotExpression = (score: number) => {
    if (score >= 80) return { emoji: '😊', status: 'Excellent' };
    if (score >= 60) return { emoji: '🙂', status: 'Good' };
    if (score >= 40) return { emoji: '😐', status: 'Fair' };
    return { emoji: '😟', status: 'Needs Work' };
  };

  const mascot = getMascotExpression(healthScore);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };


  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center mb-4 flex-shrink-0">
        <Heart className="w-5 h-5 text-red-500 mr-2" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Financial Health
        </h2>
      </div>

      {/* Main Content - Responsive Layout */}
      {widgetSize === 'square' ? (
        // Square Layout - Optimized for square widget
        <div className="flex-1 flex flex-col justify-between">
          {/* Top: Score and Mascot - Horizontal */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-1">{mascot.emoji}</div>
              <div className={`text-xl font-bold ${getScoreColor(healthScore)}`}>
                {healthScore}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                out of 100
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                Status
              </div>
              <div className={`text-sm font-medium ${getScoreColor(healthScore)}`}>
                {mascot.status}
              </div>
              <div className={`text-xs font-medium ${
                scoreChange >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange}
              </div>
            </div>
          </div>

          {/* Bottom: Contributing Factors */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Contributing Factors
            </h3>
            <div className="space-y-3">
              {factors.map((factor, index) => {
                const IconComponent = factor.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconComponent className="w-3 h-3 text-slate-500 dark:text-slate-400 mr-2" />
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {factor.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-10 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full ${getProgressColor(factor.score)}`}
                          style={{ width: `${factor.score}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getScoreColor(factor.score)} w-6 text-right`}>
                        {factor.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Half and Long Layouts
        <div className={`flex-1 flex ${
          widgetSize === 'half' ? 'items-center gap-6' : 'flex-col space-y-4'
        }`}>
          {/* Score and Mascot */}
          <div className={`${
            widgetSize === 'long' ? 'flex items-center gap-6' : 'flex-1'
          } text-center`}>
            <div className={`${
              widgetSize === 'half' ? 'text-4xl mb-3' : 'text-5xl mb-0'
            }`}>{mascot.emoji}</div>
            <div className={widgetSize === 'long' ? 'text-left' : ''}>
              <div className={`${
                widgetSize === 'half' ? 'text-2xl' : 'text-3xl'
              } font-bold mb-1 ${getScoreColor(healthScore)}`}>
                {healthScore}
              </div>
              <div className={`${
                widgetSize === 'half' ? 'text-sm' : 'text-base'
              } text-slate-500 dark:text-slate-400 mb-1`}>
                out of 100
              </div>
              <div className={`text-sm font-medium ${
                scoreChange >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange} this month
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="flex-1 space-y-3">
            <h3 className={`${
              widgetSize === 'half' ? 'text-sm' : 'text-base'
            } font-medium text-slate-600 dark:text-slate-300 mb-2`}>
              Contributing Factors
            </h3>
            {factors.map((factor, index) => {
              const IconComponent = factor.icon;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <IconComponent className={`${
                      widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'
                    } text-slate-500 dark:text-slate-400 mr-2`} />
                    <span className={`${
                      widgetSize === 'half' ? 'text-sm' : 'text-base'
                    } text-slate-700 dark:text-slate-200`}>
                      {factor.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className={`${
                      widgetSize === 'half' ? 'w-12' : 'w-16'
                    } bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2`}>
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(factor.score)}`}
                        style={{ width: `${factor.score}%` }}
                      ></div>
                    </div>
                    <span className={`${
                      widgetSize === 'half' ? 'text-sm w-6' : 'text-base w-8'
                    } font-medium ${getScoreColor(factor.score)} text-right`}>
                      {factor.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score Progress Bar - Only for non-square */}
      {widgetSize !== 'square' && (
        <div className="flex-shrink-0">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300">Status</span>
            <span className={`font-medium ${getScoreColor(healthScore)}`}>
              {mascot.status}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(healthScore)}`}
              style={{ width: `${healthScore}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
