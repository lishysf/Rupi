'use client';

import { useMemo } from 'react';
import { Pie, PieChart, Cell } from "recharts"
import { useFinancialData } from '@/contexts/FinancialDataContext';

import {
  Card,
  CardContent,
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
  const { expenses } = state.data;
  const loading = state.loading.initial && expenses.length === 0;

  // Calculate expense summary from context data
  const expenseSummary: ExpenseSummary[] = useMemo(() => {
    if (expenses.length === 0) return [];

    // Group expenses by category
    const categoryMap = new Map<string, { total: number; count: number }>();
    
    expenses.forEach(expense => {
      const category = expense.category;
      const amount = parseFloat(expense.amount);
      
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

  // Color mapping for categories
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Food & Groceries': '#10b981', // emerald
      'Transportation': '#3b82f6', // blue
      'Housing & Utilities': '#f59e0b', // amber
      'Health & Personal': '#8b5cf6', // violet
      'Entertainment & Shopping': '#ef4444', // red
      'Debt & Savings': '#06b6d4', // cyan
      'Family & Others': '#6b7280', // gray
    };
    return colorMap[category] || '#6b7280';
  };

  // Transform expense summary to chart data
  const chartData = expenseSummary.map(item => ({
    category: item.category,
    amount: item.total,
    fill: getCategoryColor(item.category),
  }));

  if (loading) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse space-y-4 w-full">
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
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
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pie className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No expense data available
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Start tracking expenses with the AI chat!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    amount: {
      label: "Amount",
    },
  } satisfies ChartConfig

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = chartData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardContent className={`flex-1 flex p-3 overflow-hidden ${
        widgetSize === 'square' ? 'flex-col' : 
        widgetSize === 'half' ? 'gap-4' : 'flex-col gap-4'
      }`}>
        {widgetSize === 'square' ? (
          // Square layout: Large pie chart with small legend below
          <>
            {/* Chart Section - Takes most space */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <ChartContainer
                config={chartConfig}
                className="w-full h-full"
              >
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="amount"
                    stroke="none"
                    strokeWidth={0}
                    cx="50%"
                    cy="50%"
                    outerRadius="95%"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [
                          formatCurrency(Number(value)),
                          name === 'amount' ? '' : name
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
            
            {/* Compact legend below */}
            <div className="flex-shrink-0 grid grid-cols-3 gap-1 mt-2">
              {chartData.map((item) => (
                <div key={item.category} className="flex items-center gap-1 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : widgetSize === 'half' ? (
          // Half layout: Pie chart on left, legend on right with separator
          <>
            {/* Chart Section - More constrained */}
            <div className="w-[45%] min-h-0">
              <ChartContainer
                config={chartConfig}
                className="w-full h-full"
              >
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="amount"
                    stroke="none"
                    strokeWidth={0}
                    cx="50%"
                    cy="50%"
                    outerRadius="85%"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [
                          formatCurrency(Number(value)),
                          name === 'amount' ? '' : name
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
            
            {/* Vertical separator */}
            <div className="w-px bg-slate-200 dark:bg-slate-600 mx-3"></div>
            
            {/* Legend Section - More space */}
            <div className="flex-1 flex flex-col justify-start gap-1 min-w-0 py-2 overflow-y-auto">
              {chartData.map((item) => (
                <div key={item.category} className="flex flex-col gap-0.5 min-w-0 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white ml-5">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Long layout: Chart on top, legend grid below
          <>
            {/* Chart Section */}
            <div className="w-full flex justify-center mb-4">
              <ChartContainer
                config={chartConfig}
                className="w-[300px] h-[300px]"
              >
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="amount"
                    stroke="none"
                    strokeWidth={0}
                    cx="50%"
                    cy="50%"
                    outerRadius="45%"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [
                          formatCurrency(Number(value)),
                          name === 'amount' ? '' : name
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
            
            {/* Legend grid */}
            <div className="w-full grid grid-cols-3 gap-3">
              {chartData.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
