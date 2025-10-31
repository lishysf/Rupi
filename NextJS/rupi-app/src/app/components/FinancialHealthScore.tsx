'use client';

import { useMemo, useState, useEffect } from 'react';
import { Heart, TrendingUp, Activity, PiggyBank, Info } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  previousMonthExpenses: number;
  savingsRate: number;
  currentBalance: number;
  savings: Array<{ amount: number | string; date: string }>;
}

interface UserWallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
}

interface FinancialHealthScoreProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function FinancialHealthScore({ widgetSize = 'square' }: FinancialHealthScoreProps) {
  const { state } = useFinancialData();
  const [showTip, setShowTip] = useState(false);
  const [assetTarget, setAssetTarget] = useState<number | null>(null);
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses, income, savings, wallets } = state.data;
  
  // Wallet loading state from context - only show loading during initial load
  const walletLoading = state.loading.wallets && state.loading.initial;

  // Load user's financial target (total asset target)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) return;
        const json = await res.json();
        const target = json?.data?.financial_goal_target;
        if (!active) return;
        if (target !== null && target !== undefined) {
          const n = typeof target === 'string' ? parseFloat(target) : Number(target);
          if (!Number.isNaN(n) && n > 0) setAssetTarget(n);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  
  // Debug log to check data
  console.log('Financial Data:', {
    expenses,
    income,
    savings,
    rawData: state.data
  });

  // Calculate financial data from context
  const financialData: FinancialData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousMonthStart.setHours(0, 0, 0, 0);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    previousMonthEnd.setHours(23, 59, 59, 999);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);
    const totalIncome = income.reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);

    // Filter for current month
    const currentMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd;
      })
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    const currentMonthIncome = income
      .filter(incomeItem => {
        const incomeDate = new Date(incomeItem.date);
        return incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd;
      })
      .reduce((sum, incomeItem) => sum + (typeof incomeItem.amount === 'string' ? parseFloat(incomeItem.amount) : incomeItem.amount), 0);

    // Filter for previous month
    const previousMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= previousMonthStart && expenseDate <= previousMonthEnd;
      })
      .reduce((sum, expense) => sum + (typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount), 0);

    const savingsRate = currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      currentMonthIncome,
      currentMonthExpenses,
      previousMonthExpenses,
      savingsRate,
      currentBalance: 0, // Will be calculated from wallets
      savings
    };
  }, [expenses, income, savings]);

  // Calculate health score based on monthly buffer and total assets
  const calculateHealthScore = () => {
    let score = 0;
    
    // Factor 1: Monthly Buffer (50% of total score)
    // Kemampuan menabung dari penghasilan bulanan
    const monthlyBuffer = financialData.currentMonthIncome - financialData.currentMonthExpenses;
    const bufferPercentage = financialData.currentMonthIncome > 0 
      ? (monthlyBuffer / financialData.currentMonthIncome) * 100 
      : 0;

    // Score based on buffer percentage (max 50 points)
    // More achievable targets for saving percentage
    if (bufferPercentage >= 30) score += 50;      // Excellent: Bisa nabung 30%+ dari income
    else if (bufferPercentage >= 25) score += 45; // Very Good: Nabung 25-29%
    else if (bufferPercentage >= 20) score += 40; // Good Plus: Nabung 20-24%
    else if (bufferPercentage >= 15) score += 35; // Good: Nabung 15-19%
    else if (bufferPercentage >= 10) score += 30; // Fair Plus: Nabung 10-14%
    else if (bufferPercentage >= 5) score += 25;  // Fair: Nabung 5-9%
    else if (bufferPercentage > 0) score += 20;   // Starting: Mulai nabung
    // 0 points if no savings
    
    // Factor 2: Total Assets (50% of total score)
    // Total aset (wallet balance + savings)
    const walletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    const totalSavings = financialData.savings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
    const totalAssets = walletBalance + totalSavings;
    
    // Score based on total assets (max 50 points) relative to user's Financial Target
    const targetBase = assetTarget && assetTarget > 0 ? assetTarget : 500000000; // fallback 500jt
    const assetsProgress = Math.min(1, Math.max(0, totalAssets / targetBase));
    score += Math.round(assetsProgress * 50);
    
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

  // Calculate progress bar scores
  const calculateMonthlyBuffer = () => {
    if (financialData.currentMonthIncome <= 0) return { percentage: 0, score: 0 };
    const buffer = financialData.currentMonthIncome - financialData.currentMonthExpenses;
    const percentage = Math.max(0, Math.min(100, (buffer / financialData.currentMonthIncome) * 100));
    return { 
      percentage: Math.round(percentage), 
      score: percentage // Score should match the actual percentage
    };
  };

  const calculateTotalAssets = () => {
      // Calculate wallet total balance (user's actual available money)
      const walletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
  
      // Calculate total savings
      const totalSavings = financialData.savings.reduce((sum, saving) => sum + (typeof saving.amount === 'string' ? parseFloat(saving.amount) : saving.amount), 0);
  
      // Total assets = wallet balance + savings
      const totalAssets = walletBalance + totalSavings;
    
    console.log('Assets Calculation:', {
      walletBalance,
      savings: financialData.savings,
      totalSavings,
      totalAssets
    });
    
    // Calculate percentage based on user's financial target (fallback 500jt for percentage only)
    const targetAssets = assetTarget && assetTarget > 0 ? assetTarget : null;
    const percentageBase = targetAssets ?? 500000000;
    const percentage = Math.min(100, Math.max(0, (totalAssets / percentageBase) * 100));
    
    return { 
      amount: totalAssets,
      score: percentage,
      percentage: Math.round(percentage),
      target: targetAssets
    };
  };

  const monthlyBuffer = calculateMonthlyBuffer();
  const totalAssets = calculateTotalAssets();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const factors = [
    { 
      name: t('monthlyBufferLabel'), 
      score: monthlyBuffer.score,
      detail: `${monthlyBuffer.percentage}%`,
      icon: Activity 
    },
    { 
      name: t('totalAssetsLabel'), 
      score: totalAssets.percentage, // Use percentage for progress bar
      detail: totalAssets.target ? `${formatCurrency(totalAssets.amount)} / ${formatCurrency(totalAssets.target)}` : `${formatCurrency(totalAssets.amount)}`,
      icon: PiggyBank 
    }
  ];

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
    if (score >= 60) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-emerald-500 dark:text-emerald-500';
    return 'text-emerald-700 dark:text-emerald-300';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-green-500';
    if (score >= 40) return 'bg-emerald-400';
    return 'bg-emerald-600';
  };


  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-transparent p-3 h-full flex flex-col group hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mr-2 shadow-lg">
            <Heart className="w-2.5 h-2.5 text-white" />
          </div>
          <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            {t('financialHealth')}
          </h2>
        </div>
        <div 
          className="relative inline-block"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <div
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-default"
            aria-label="How is this calculated?"
          >
            <Info className="w-3 h-3" />
            How it works
          </div>
          {showTip && (
            <div className="absolute right-0 top-6 w-72 sm:w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-3 z-50">
              <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-2">
                <div className="font-semibold">What affects your score</div>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5 text-emerald-600">50%</div>
                  <div>
                    <div className="font-medium">Monthly Buffer</div>
                    <div>How much of your income you keep after spending each month. Bigger buffer = better health.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5 text-emerald-600">50%</div>
                  <div>
                    <div className="font-medium">Total Assets Progress</div>
                    <div>Your wallets + savings, moving toward your Financial Target from onboarding.</div>
                  </div>
                </div>
                <div className="text-neutral-500 dark:text-neutral-400">Tip: Set a realistic Financial Target to personalize the goal.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Side by Side Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Side - Big Emoji and Score */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-shrink-0 w-20">
          <div className="text-6xl mb-2">{mascot.emoji}</div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(healthScore)}`}>
              {healthScore}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('financialScore')}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px bg-neutral-200 dark:bg-neutral-600 my-2"></div>

        {/* Right Side - Progress Bars */}
        <div className="flex-1 space-y-4 min-h-0 pt-4">
          {factors.map((factor, index) => {
            const IconComponent = factor.icon;
            return (
              <div key={index} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <IconComponent className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mr-2" />
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      {factor.name}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${getScoreColor(factor.score)}`}>
                    {factor.detail}
                  </span>
                </div>
                <div className="relative h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(factor.score)} shadow-sm`}
                    style={{ width: `${Math.min(100, Math.max(0, factor.score))}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Tooltip handled via group hover above */}
    </div>
  );
}
