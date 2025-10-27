'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Sidebar from '@/app/components/Sidebar';
import TrendsChart from '@/app/components/TrendsChart';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line, LineChart } from 'recharts';

// Monthly expense breakdown component - shows all categories for current month
function MonthlyExpenseBreakdown() {
  const { state } = useFinancialData();
  const { expenses } = state.data;

  const currentMonthData = useMemo(() => {
    const currentMonth = new Date();
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    });

    // All possible expense categories
    const allCategories = [
      'Rent', 'Mortgage', 'Electricity', 'Water', 'Internet', 'Gas Utility', 'Home Maintenance', 'Household Supplies',
      'Groceries', 'Dining Out', 'Coffee & Tea', 'Food Delivery',
      'Fuel', 'Parking', 'Public Transport', 'Ride Hailing', 'Vehicle Maintenance', 'Toll',
      'Medical & Pharmacy', 'Health Insurance', 'Fitness', 'Personal Care',
      'Clothing', 'Electronics & Gadgets', 'Subscriptions & Streaming', 'Hobbies & Leisure', 'Gifts & Celebration',
      'Debt Payments', 'Taxes & Fees', 'Bank Charges',
      'Childcare', 'Education', 'Pets',
      'Travel', 'Business Expenses', 'Charity & Donations', 'Emergency', 'Others'
    ];

    // Group by category
    const categoryMap = new Map<string, { total: number; count: number }>();
    
    currentMonthExpenses.forEach(expense => {
      const category = expense.category;
      const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category)!;
        categoryMap.set(category, {
          total: existing.total + amount,
          count: existing.count + 1
        });
      } else {
        categoryMap.set(category, {
          total: amount,
          count: 1
        });
      }
    });

    // Create data for all categories, showing 0 for categories with no transactions
    const allCategoryData = allCategories.map(category => {
      const data = categoryMap.get(category) || { total: 0, count: 0 };
      return {
        category,
        total: data.total,
        count: data.count,
        formatted: new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(data.total)
      };
    });

    // Filter to show only categories with transactions or top categories
    const categoriesWithTransactions = allCategoryData.filter(item => item.total > 0);
    const topCategories = allCategoryData
      .filter(item => item.total === 0)
      .slice(0, 10); // Show top 10 unused categories as 0

    return [...categoriesWithTransactions, ...topCategories].sort((a, b) => b.total - a.total);
  }, [expenses]);

  const totalExpenses = currentMonthData.reduce((sum, item) => sum + item.total, 0);
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const chartConfig = {
    total: {
      label: "Amount",
    },
  } satisfies ChartConfig;

  return (
    <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent h-full">
      <CardHeader>
        <CardTitle className="text-lg">Current Month Expense Breakdown</CardTitle>
        <CardDescription>{currentMonth} - All categories</CardDescription>
      </CardHeader>
      <CardContent className="h-full p-6">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart 
            data={currentMonthData}
            width={undefined}
            height={undefined}
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="category"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                } else {
                  return value.toString();
                }
              }}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        Category: {label}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Amount: {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Number(data.value))}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="total" 
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Financial insights component
function FinancialInsights() {
  const { state } = useFinancialData();
  const { expenses, income } = state.data;
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);

  const insights = useMemo(() => {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    // Current month data
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth.getMonth() && 
             expenseDate.getFullYear() === currentMonth.getFullYear();
    });
    
    const currentMonthIncome = income.filter(inc => {
      const incomeDate = new Date(inc.date);
      return incomeDate.getMonth() === currentMonth.getMonth() && 
             incomeDate.getFullYear() === currentMonth.getFullYear();
    });

    // Last month data
    const lastMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === lastMonth.getMonth() && 
             expenseDate.getFullYear() === lastMonth.getFullYear();
    });
    
    const lastMonthIncome = income.filter(inc => {
      const incomeDate = new Date(inc.date);
      return incomeDate.getMonth() === lastMonth.getMonth() && 
             incomeDate.getFullYear() === lastMonth.getFullYear();
    });

    // Calculate totals
    const currentExpenses = currentMonthExpenses.reduce((sum, exp) => 
      sum + (typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount), 0);
    const currentIncome = currentMonthIncome.reduce((sum, inc) => 
      sum + (typeof inc.amount === 'string' ? parseFloat(inc.amount) : inc.amount), 0);
    const lastExpenses = lastMonthExpenses.reduce((sum, exp) => 
      sum + (typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount), 0);
    const lastIncome = lastMonthIncome.reduce((sum, inc) => 
      sum + (typeof inc.amount === 'string' ? parseFloat(inc.amount) : inc.amount), 0);

    // Calculate changes
    const expenseChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;
    const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;

    return {
      currentExpenses,
      currentIncome,
      expenseChange,
      incomeChange,
      savingsRate,
      netWorth: currentIncome - currentExpenses
    };
  }, [expenses, income]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(insights.currentIncome)}
              </p>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {insights.incomeChange >= 0 ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm ml-1 ${insights.incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(insights.incomeChange).toFixed(1)}% vs last month
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(insights.currentExpenses)}
              </p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {insights.expenseChange <= 0 ? (
              <ArrowDownIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowUpIcon className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm ml-1 ${insights.expenseChange <= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(insights.expenseChange).toFixed(1)}% vs last month
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Savings Rate</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {insights.savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            {insights.savingsRate >= 20 ? 'Excellent!' : insights.savingsRate >= 10 ? 'Good' : 'Needs improvement'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Net Worth</p>
              <p className={`text-2xl font-bold ${insights.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(insights.netWorth)}
              </p>
            </div>
            <div className={`p-2 ${insights.netWorth >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'} rounded-lg`}>
              <ChartBarIcon className={`h-6 w-6 ${insights.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            {insights.netWorth >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Analytics component
function AnalyticsContent() {
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar currentPage="Analytics" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-12 lg:pt-0">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                    <ChartPieIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    Analytics
                  </h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Comprehensive financial analysis and insights
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Current Month</div>
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Financial Insights Cards */}
            <div className="mb-8">
              <FinancialInsights />
            </div>

            {/* Charts Grid */}
            <div className="space-y-6 mb-8">
              {/* Trends Chart - Shorter */}
              <div className="h-80">
                <TrendsChart widgetSize="half" />
              </div>

              {/* Monthly Expense Breakdown - Full Width */}
              <div className="h-[500px]">
                <MonthlyExpenseBreakdown />
              </div>

              {/* Category Breakdown - Under Bar Chart */}
              <div className="h-96">
                <CategoryBreakdown widgetSize="square" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Analytics Page
export default function AnalyticsPage() {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            Fundy
          </div>
          <div className="text-neutral-600 dark:text-neutral-400">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <FinancialDataProvider>
      <AnalyticsContent />
    </FinancialDataProvider>
  );
}