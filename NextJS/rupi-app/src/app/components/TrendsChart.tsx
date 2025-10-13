'use client';

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFinancialData } from '@/contexts/FinancialDataContext'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Interface for analytics data
interface AnalyticsData {
  date: string;
  value: number;
  income?: number;
  expenses?: number;
  savings?: number;
  investments?: number;
  net?: number;
  total_assets?: number;
  top_expenses?: Array<{category: string, amount: number, count: number}>;
}


const chartConfig = {
  value: {
    label: "Value",
    color: "#10b981", // emerald-500 - Fundy green
  },
  total_assets: {
    label: "Assets",
    color: "#10b981", // Green color for assets
  },
  expenses: {
    label: "Expenses",
    color: "#ef4444", // Red color for expenses
  },
  savings: {
    label: "Savings",
    color: "#eab308", // Yellow color for savings
  },
  income: {
    label: "Income",
    color: "#3b82f6", // Blue color for income
  },
} satisfies ChartConfig

interface TrendsChartProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function TrendsChart({ widgetSize = 'half' }: TrendsChartProps) {
  const { fetchTrends, state } = useFinancialData()
  const [timeRange, setTimeRange] = React.useState("month")
  const [dataType, setDataType] = React.useState("total_assets")
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate analytics data from context (same as Financial Summary)
  const calculateAnalyticsData = React.useCallback(() => {
    try {
      setError(null)
      
      // Get data from context (same as Financial Summary)
      const { wallets, savings, income, expenses, investments } = state.data
      
      // Calculate total assets (same logic as Financial Summary)
      const walletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
      const totalSavings = savings.reduce((sum, saving) => sum + parseFloat(saving.amount), 0)
      const totalInvestments = (investments || []).reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0)
      const totalAssets = walletBalance + totalSavings + totalInvestments
      
      // Calculate other totals
      const totalIncome = income.reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount), 0)
      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
      
      // Create data points for the selected time range
      const now = new Date()
      let startDate: Date
      let endDate: Date
      
      if (timeRange === 'week') {
        endDate = new Date()
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 6) // 7 days total including today
      } else { // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      
      // Generate date series
      const dateSeries = []
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        dateSeries.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Transform to chart format
      const transformedData = dateSeries.map((date, index) => {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const displayDate = `${month}/${day}`
        const dateString = date.toISOString().split('T')[0]
        
        // Calculate daily amounts for each date
        let dailyValue = 0
        let dailyIncome = 0
        let dailyExpenses = 0
        let dailySavings = 0
        
        if (dataType === 'total_assets') {
          // For assets, use the same calculation as Financial Summary
          // Total assets = wallet balance + savings + investments
          // But for historical data, we need to calculate cumulative values
          
          // Find the earliest transaction date
          const allDates = [
            ...income.map(item => new Date(item.date).toISOString().split('T')[0]),
            ...expenses.map(item => new Date(item.date).toISOString().split('T')[0]),
            ...savings.map(item => new Date(item.date).toISOString().split('T')[0]),
            ...(investments || []).map(item => new Date(item.date).toISOString().split('T')[0])
          ].filter(Boolean).sort()
          
          const earliestDate = allDates.length > 0 ? allDates[0] : null
          
          // If this date is before any transactions, show 0
          if (earliestDate && dateString < earliestDate) {
            dailyValue = 0
          } else {
            // For now, show current total assets for all dates
            // This matches the Financial Summary calculation exactly
            dailyValue = totalAssets
          }
        } else {
          // For income, expenses, savings - calculate daily amounts
          if (dataType === 'income') {
            dailyIncome = income
              .filter(item => {
                const itemDate = new Date(item.date).toISOString().split('T')[0]
                // Exclude initial wallet balance transactions
                const isInitialBalance = item.description && (
                  item.description.toLowerCase().includes('initial balance') ||
                  item.description.toLowerCase().includes('wallet creation') ||
                  item.description.toLowerCase().includes('starting balance')
                )
                return itemDate === dateString && !isInitialBalance
              })
              .reduce((sum, item) => sum + parseFloat(item.amount), 0)
            dailyValue = dailyIncome
          } else if (dataType === 'expense') {
            dailyExpenses = expenses
              .filter(item => {
                const itemDate = new Date(item.date).toISOString().split('T')[0]
                return itemDate === dateString
              })
              .reduce((sum, item) => sum + parseFloat(item.amount), 0)
            dailyValue = dailyExpenses
          } else if (dataType === 'savings') {
            dailySavings = savings
              .filter(item => {
                const itemDate = new Date(item.date).toISOString().split('T')[0]
                return itemDate === dateString
              })
              .reduce((sum, item) => sum + parseFloat(item.amount), 0)
            dailyValue = dailySavings
          }
        }
        
        return {
          date: displayDate,
          fullDate: dateString,
          value: Math.max(0, dailyValue / 1000), // Convert to thousands
          income: dailyIncome,
          expenses: dailyExpenses,
          savings: dailySavings,
          investments: totalInvestments, // Keep total for investments
          net: dailyIncome - dailyExpenses,
          total_assets: totalAssets, // Keep total for assets
          top_expenses: []
        }
      })
      
      setAnalyticsData(transformedData)
      setLoading(false) // Ensure loading is set to false
    } catch (err) {
      setError('Failed to calculate analytics data')
      console.error('Error calculating analytics data:', err)
      setLoading(false) // Ensure loading is set to false even on error
    }
  }, [timeRange, dataType, state.data.wallets, state.data.savings, state.data.income, state.data.expenses, state.data.investments])

  // Calculate data when component mounts or when filters change
  React.useEffect(() => {
    if (!state.loading.initial) {
      setLoading(true)
      calculateAnalyticsData()
    }
  }, [timeRange, dataType, state.loading.initial])

  // Refresh data when context data changes (like other components)
  React.useEffect(() => {
    // Only refresh if we have data and it's not the initial load
    if (!state.loading.initial && !loading && (state.data.wallets?.length > 0 || state.data.savings?.length > 0 || state.data.investments?.length > 0)) {
      setIsUpdating(true)
      calculateAnalyticsData()
    }
  }, [state.data.wallets, state.data.savings, state.data.investments, state.data.expenses, state.data.income, state.loading.initial, loading])

  // Calculate peak value for highlighting
  const peakValue = analyticsData.length > 0 ? Math.max(...analyticsData.map(d => d.value)) : 0
  const peakData = analyticsData.find(d => d.value === peakValue)
  
  // Calculate dynamic Y-axis domain
  const maxValue = peakValue || 100
  const minValue = analyticsData.length > 0 ? Math.min(...analyticsData.map(d => d.value)) : 0
  const yAxisMax = Math.ceil(maxValue * 1.2) // Add 20% padding for better visibility
  const yAxisMin = Math.max(0, Math.floor(minValue * 0.8)) // Add some padding below minimum

  return (
    <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent h-full flex flex-col">
      <CardHeader className={`flex items-center gap-2 space-y-0 border-b border-neutral-200 dark:border-transparent sm:flex-row flex-shrink-0 ${
        widgetSize === 'square' ? 'py-2 px-3' : 'py-3 px-6'
      }`}>
        <div className="grid flex-1 gap-1 min-w-0">
          <CardTitle className={`text-neutral-900 dark:text-neutral-100 ${
            widgetSize === 'square' ? 'text-sm' :
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } truncate flex items-center gap-2`}>
            {dataType === 'total_assets' ? 'Assets' :
             dataType === 'savings' ? 'Savings' :
             dataType === 'expense' ? 'Expenses' :
             dataType === 'income' ? 'Income' : 'Analytics'}
            {isUpdating && (
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            )}
          </CardTitle>
        </div>
        <div className="flex gap-2">
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger
              className={`${
                widgetSize === 'square' ? 'w-[90px]' : 'w-[120px]'
              } rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs flex-shrink-0 min-w-0`}
              aria-label="Select data type"
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 min-w-[120px]">
              <SelectItem value="total_assets" className="rounded-lg text-xs cursor-pointer">Assets</SelectItem>
              <SelectItem value="savings" className="rounded-lg text-xs cursor-pointer">Savings</SelectItem>
              <SelectItem value="expense" className="rounded-lg text-xs cursor-pointer">Expenses</SelectItem>
              <SelectItem value="income" className="rounded-lg text-xs cursor-pointer">Income</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className={`${
                widgetSize === 'square' ? 'w-[70px]' : 'w-[100px]'
              } rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs flex-shrink-0 min-w-0`}
              aria-label="Select time range"
            >
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 min-w-[100px]">
              <SelectItem value="week" className="rounded-lg text-xs cursor-pointer">Week</SelectItem>
              <SelectItem value="month" className="rounded-lg text-xs cursor-pointer">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className={`flex-1 flex flex-col overflow-hidden ${
        widgetSize === 'square' ? 'p-2' : 'p-3'
      }`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Loading analytics...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-red-600 dark:text-red-400">Error: {error}</div>
          </div>
        ) : analyticsData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">No data available</div>
              <div className="text-xs text-neutral-400 dark:text-neutral-500">Start tracking expenses to see trends</div>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={`flex-1 min-h-0 ${
              widgetSize === 'square' ? 'mb-2' : 'mb-3'
            }`}
          >
            <AreaChart 
              data={analyticsData}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              className={`transition-all duration-500 ease-in-out ${isUpdating ? 'opacity-80' : 'opacity-100'}`}
            >
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-expenses)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-expenses)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSavings" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-savings)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-savings)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillAssets" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-total_assets)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-total_assets)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(value) => {
                // Since we're already formatting the date in the data transformation,
                // we can just return the value as is
                return value
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="#64748b"
              fontSize={10}
              domain={[yAxisMin, yAxisMax]}
              tickFormatter={(value) => {
                return `${value}k`
              }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                
                const entry = payload[0];
                const data = entry.payload;
                
                // Format the full date for display
                const formatDate = (dateString: string) => {
                  try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  } catch {
                    return dateString;
                  }
                };
                
                // Determine tooltip color and content based on data type
                const isExpense = dataType === 'expense';
                const isAssets = dataType === 'total_assets';
                const isSavings = dataType === 'savings';
                const isIncome = dataType === 'income';
                
                const bgColor = isExpense ? 'bg-red-600' : 
                               isAssets ? 'bg-emerald-600' :
                               isSavings ? 'bg-yellow-600' :
                               isIncome ? 'bg-blue-600' : 'bg-emerald-600';
                
                return (
                  <div className={`${bgColor} text-white rounded-lg shadow-lg p-3 min-w-[200px]`}>
                    <div className="text-xs opacity-90 mb-1">
                      {data?.fullDate ? formatDate(data.fullDate) : label}
                    </div>
                    <div className="text-sm font-medium mb-2">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(Number(entry.value) * 1000)}
                    </div>
                    <div className="text-xs opacity-80 mb-2">
                      {dataType === 'total_assets' ? 'Assets' :
                       dataType === 'savings' ? 'Savings' :
                       dataType === 'expense' ? 'Expenses' :
                       dataType === 'income' ? 'Income' : 'Assets'}
                    </div>
                    
                    {/* Show top 3 expense categories for expense charts */}
                    {isExpense && data?.top_expenses && data.top_expenses.length > 0 && (
                      <div className="border-t border-white/20 pt-2 mt-2">
                        <div className="text-xs opacity-90 mb-1">Top Categories:</div>
                        {data.top_expenses.slice(0, 3).map((category: any, index: number) => (
                          <div key={index} className="text-xs opacity-80 flex justify-between">
                            <span className="truncate max-w-[120px]" title={category.category}>
                              {category.category}
                            </span>
                            <span className="ml-2">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(category.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              fill={dataType === 'expense' ? "url(#fillExpenses)" : 
                    dataType === 'savings' ? "url(#fillSavings)" : 
                    dataType === 'income' ? "url(#fillIncome)" :
                    dataType === 'total_assets' ? "url(#fillAssets)" :
                    "url(#fillValue)"}
              stroke={dataType === 'expense' ? "var(--color-expenses)" : 
                     dataType === 'savings' ? "var(--color-savings)" : 
                     dataType === 'income' ? "var(--color-income)" :
                     dataType === 'total_assets' ? "var(--color-total_assets)" :
                     "var(--color-value)"}
              strokeWidth={2}
              fillOpacity={0.6}
              animationDuration={500}
              animationEasing="ease-in-out"
            />
            </AreaChart>
          </ChartContainer>
        )}

      </CardContent>
    </Card>
  );
}



