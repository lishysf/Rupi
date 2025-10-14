'use client';

import { useMemo } from 'react';
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { Pie, PieChart, Cell, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ExpenseSummary {
  category: string;
  total: number;
  count: number;
}

interface CategoryBreakdownProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function CategoryBreakdown({ widgetSize = 'square' }: CategoryBreakdownProps) {
  const { state } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses } = state.data;
  const loading = state.loading.initial && expenses.length === 0;

  // Calculate expense summary from context data
  const expenseSummary: ExpenseSummary[] = useMemo(() => {
    if (expenses.length === 0) return [];

    // Group expenses by category
    const categoryMap = new Map<string, { total: number; count: number }>();
    
    expenses.forEach(expense => {
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

    // Convert to array and sort by total amount descending
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Fundy green theme color palette - various shades of green with complementary colors
  const distinctColors = [
    '#10b981', // emerald-500 - primary green
    '#059669', // emerald-600 - darker green
    '#047857', // emerald-700 - dark green
    '#34d399', // emerald-400 - light green
    '#6ee7b7', // emerald-300 - lighter green
    '#a7f3d0', // emerald-200 - very light green
    '#065f46', // emerald-800 - very dark green
    '#064e3b', // emerald-900 - darkest green
    '#22c55e', // green-500 - alternative green
    '#16a34a', // green-600 - alternative dark green
    '#15803d', // green-700 - alternative darker green
    '#4ade80', // green-400 - alternative light green
    '#86efac', // green-300 - alternative lighter green
    '#bbf7d0', // green-200 - alternative very light green
    '#166534', // green-800 - alternative very dark green
    '#14532d', // green-900 - alternative darkest green
  ];

  // Color mapping for categories - High contrast colors that don't blend
  const getCategoryColor = (category: string, index: number = 0) => {
    const colorMap: Record<string, string> = {
      'Food & Groceries': '#10b981', // emerald-500 - primary green
      'Transportation': '#059669', // emerald-600 - darker green
      'Housing & Utilities': '#047857', // emerald-700 - dark green
      'Health & Personal': '#34d399', // emerald-400 - light green
      'Entertainment & Shopping': '#6ee7b7', // emerald-300 - lighter green
      'Debt Payments': '#065f46', // emerald-800 - very dark green (for debt)
      'Savings & Investments': '#22c55e', // green-500 - alternative green
      'Family & Others': '#16a34a', // green-600 - alternative dark green
      'Education': '#15803d', // green-700 - alternative darker green
      'Insurance': '#4ade80', // green-400 - alternative light green
      'Travel': '#86efac', // green-300 - alternative lighter green
      'Subscriptions': '#a7f3d0', // emerald-200 - very light green
      'Gifts & Donations': '#bbf7d0', // green-200 - alternative very light green
      'Miscellaneous': '#064e3b', // emerald-900 - darkest green
    };
    
    // Return mapped color or fallback to distinct color palette
    return colorMap[category] || distinctColors[index % distinctColors.length];
  };

  // Transform expense summary to chart data
  const chartData = expenseSummary.map((item, index) => ({
    category: item.category,
    amount: item.total,
    fill: getCategoryColor(item.category, index),
  }));

  // Chart configuration
  const chartConfig = {
    amount: {
      label: "Amount",
    },
    ...chartData.reduce((config, item) => {
      config[item.category.toLowerCase().replace(/\s+/g, '_')] = {
        label: item.category,
        color: item.fill,
      };
      return config;
    }, {} as Record<string, { label: string; color: string }>),
  } satisfies ChartConfig;

  if (loading) {
    return (
      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse space-y-4 w-full">
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0 && !loading) {
    return (
      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChartIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {t('noExpenseData')}
            </p>
            <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
              {t('startTracking')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = chartData.reduce((sum, item) => sum + item.amount, 0);
  const largestCategory = chartData[0]; // First item is the largest since we sort by amount

  return (
    <Card className="bg-white dark:bg-neutral-900 flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg">{t('expenseBreakdown')}</CardTitle>
        <CardDescription>{t('categoryAnalysis')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="category"
              innerRadius={40}
              strokeWidth={5}
              activeIndex={0}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 10} />
              )}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
