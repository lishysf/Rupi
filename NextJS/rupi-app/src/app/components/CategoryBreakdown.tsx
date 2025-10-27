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

interface BroadCategoryData {
  broadCategory: string;
  total: number;
  count: number;
  subcategories: ExpenseSummary[];
}

// Category mapping to group specific categories into broad categories
const CATEGORY_MAPPING: Record<string, string> = {
  // Housing & Utilities
  'Rent': 'Housing & Utilities',
  'Mortgage': 'Housing & Utilities',
  'Electricity': 'Housing & Utilities',
  'Water': 'Housing & Utilities',
  'Internet': 'Housing & Utilities',
  'Gas Utility': 'Housing & Utilities',
  'Home Maintenance': 'Housing & Utilities',
  'Household Supplies': 'Housing & Utilities',

  // Food & Dining
  'Groceries': 'Food & Dining',
  'Dining Out': 'Food & Dining',
  'Coffee & Tea': 'Food & Dining',
  'Food Delivery': 'Food & Dining',

  // Transportation
  'Fuel': 'Transportation',
  'Parking': 'Transportation',
  'Public Transport': 'Transportation',
  'Ride Hailing': 'Transportation',
  'Vehicle Maintenance': 'Transportation',
  'Toll': 'Transportation',

  // Health & Personal
  'Medical & Pharmacy': 'Health & Personal',
  'Health Insurance': 'Health & Personal',
  'Fitness': 'Health & Personal',
  'Personal Care': 'Health & Personal',

  // Entertainment & Shopping
  'Clothing': 'Entertainment & Shopping',
  'Electronics & Gadgets': 'Entertainment & Shopping',
  'Subscriptions & Streaming': 'Entertainment & Shopping',
  'Hobbies & Leisure': 'Entertainment & Shopping',
  'Gifts & Celebration': 'Entertainment & Shopping',

  // Financial Obligations
  'Debt Payments': 'Financial Obligations',
  'Taxes & Fees': 'Financial Obligations',
  'Bank Charges': 'Financial Obligations',

  // Family & Education
  'Childcare': 'Family & Education',
  'Education': 'Family & Education',
  'Pets': 'Family & Education',

  // Miscellaneous
  'Travel': 'Miscellaneous',
  'Business Expenses': 'Miscellaneous',
  'Charity & Donations': 'Miscellaneous',
  'Emergency': 'Miscellaneous',
  'Others': 'Miscellaneous'
};

interface CategoryBreakdownProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function CategoryBreakdown({ widgetSize = 'square' }: CategoryBreakdownProps) {
  const { state } = useFinancialData();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  const { expenses } = state.data;

  // Calculate broad category summary from context data
  const broadCategoryData: BroadCategoryData[] = useMemo(() => {
    if (expenses.length === 0) return [];

    // First, group expenses by specific category
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

    // Convert to array of specific categories
    const specificCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total);

    // Group specific categories into broad categories
    const broadCategoryMap = new Map<string, { total: number; count: number; subcategories: ExpenseSummary[] }>();
    
    specificCategories.forEach(item => {
      const broadCategory = CATEGORY_MAPPING[item.category] || 'Miscellaneous';
      
      if (broadCategoryMap.has(broadCategory)) {
        const existing = broadCategoryMap.get(broadCategory)!;
        broadCategoryMap.set(broadCategory, {
          total: existing.total + item.total,
          count: existing.count + item.count,
          subcategories: [...existing.subcategories, item]
        });
      } else {
        broadCategoryMap.set(broadCategory, {
          total: item.total,
          count: item.count,
          subcategories: [item]
        });
      }
    });

    // Convert to array and sort by total amount descending
    return Array.from(broadCategoryMap.entries())
      .map(([broadCategory, data]) => ({
        broadCategory,
        total: data.total,
        count: data.count,
        subcategories: data.subcategories.sort((a, b) => b.total - a.total)
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

  // Color mapping for broad categories - High contrast colors that don't blend
  const getBroadCategoryColor = (category: string, index: number = 0) => {
    const colorMap: Record<string, string> = {
      'Housing & Utilities': '#10b981', // emerald-500 - primary green
      'Food & Dining': '#059669', // emerald-600 - darker green
      'Transportation': '#047857', // emerald-700 - dark green
      'Health & Personal': '#34d399', // emerald-400 - light green
      'Entertainment & Shopping': '#6ee7b7', // emerald-300 - lighter green
      'Financial Obligations': '#065f46', // emerald-800 - very dark green (for debt)
      'Family & Education': '#22c55e', // green-500 - alternative green
      'Miscellaneous': '#064e3b', // emerald-900 - darkest green
    };
    
    // Return mapped color or fallback to distinct color palette
    return colorMap[category] || distinctColors[index % distinctColors.length];
  };

  // Transform broad category data to chart data
  const chartData = broadCategoryData.map((item, index) => ({
    category: item.broadCategory,
    amount: item.total,
    fill: getBroadCategoryColor(item.broadCategory, index),
    subcategories: item.subcategories,
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

  if (chartData.length === 0) {
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

  // Custom tooltip component that shows subcategories
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.amount / totalExpenses) * 100).toFixed(1);
      
      return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-4 max-w-xs relative z-50">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.fill }}
            />
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              {data.category}
            </h4>
          </div>
          
          <div className="mb-3">
            <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(data.amount)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {percentage}% of total expenses
            </div>
          </div>

          {data.subcategories && data.subcategories.length > 0 && (
            <div>
              <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Subcategories:
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.subcategories.map((sub: ExpenseSummary, index: number) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]">
                      {sub.category}
                    </span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium ml-2">
                      {formatCurrency(sub.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-neutral-900 flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg">{t('expenseBreakdown')}</CardTitle>
        <CardDescription>{t('categoryAnalysis')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] relative"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip />}
              allowEscapeViewBox={{ x: true, y: true }}
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
