'use client';

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useFinancialData } from '@/contexts/FinancialDataContext'
import { 
  getIndonesiaDate, 
  getIndonesiaStartOfMonth, 
  getIndonesiaEndOfMonth, 
  formatIndonesiaDate,
  getIndonesiaLastDaysRange 
} from '@/lib/indonesia-timezone'

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

  // Format Rupiah values with Indonesian suffixes
  const formatRupiahValue = (amount: number) => {
    if (amount >= 1000000000000) {
      return `${(amount / 1000000000000).toFixed(1)}t`;
    } else if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}m`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}jt`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    } else {
      return amount.toString();
    }
  };

  // Format values for Y-axis with abbreviated format (RB, JT, M, T)
  const formatYAxisValue = (amount: number) => {
    if (amount >= 1000000000000) {
      const value = (amount / 1000000000000).toFixed(1);
      return `${value.endsWith('.0') ? value.slice(0, -2) : value}T`;
    } else if (amount >= 1000000000) {
      const value = (amount / 1000000000).toFixed(1);
      return `${value.endsWith('.0') ? value.slice(0, -2) : value}M`;
    } else if (amount >= 1000000) {
      const value = (amount / 1000000).toFixed(1);
      return `${value.endsWith('.0') ? value.slice(0, -2) : value}JT`;
    } else if (amount >= 1000) {
      const value = (amount / 1000).toFixed(1);
      return `${value.endsWith('.0') ? value.slice(0, -2) : value}RB`;
    } else {
      return amount.toString();
    }
  };

  // Calculate analytics data from context (same as Financial Summary)
  const calculateAnalyticsData = React.useCallback(() => {
    try {
      setError(null)
      
      // Get data from context (same as Financial Summary)
      const { wallets, savings, income, expenses } = state.data
      
      // Calculate total assets (same logic as Financial Summary)
      const walletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0)
      const totalSavings = savings.reduce((sum, saving) => sum + parseFloat(saving.amount.toString()), 0)
      const totalAssets = walletBalance + totalSavings
      
      // Calculate other totals
      const totalIncome = income.reduce((sum, incomeItem) => sum + parseFloat(incomeItem.amount.toString()), 0)
      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0)
      
      // Create data points for the selected time range using Indonesia timezone
      const now = getIndonesiaDate()
      let startDate: Date
      let endDate: Date
      
      if (timeRange === 'week') {
        const weekRange = getIndonesiaLastDaysRange(7)
        startDate = weekRange.startDate
        endDate = weekRange.endDate
      } else { // month
        startDate = getIndonesiaStartOfMonth(now)
        endDate = getIndonesiaEndOfMonth(now)
      }
      
      // Generate date series
      const dateSeries: Date[] = []
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        dateSeries.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Calculate wallet balance progressively for each date
      // Start from 0 and add all transactions chronologically
      console.log('🔍 Asset Calculation Debug:')
      console.log('Current wallet balance:', walletBalance)
      console.log('Start date:', dateSeries[0].toISOString().split('T')[0])
      
      // Get all income and expense transactions sorted by date
      const allTransactions = [...income.map(i => ({ ...i, type: 'income' as const })), 
                               ...expenses.map(e => ({ ...e, type: 'expense' as const }))]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      console.log('Total transactions:', allTransactions.length)
      
      // Transform to chart format - calculate progressively forward
      let runningWalletBalance = 0
      const transformedData = dateSeries.map((date, index) => {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const displayDate = `${month}/${day}`
        const dateString = formatIndonesiaDate(date)
        
        // Calculate daily amounts for each date
        let dailyValue = 0
        let dailyIncome = 0
        let dailyExpenses = 0
        let dailySavings = 0
        
        if (dataType === 'total_assets') {
          // Get all transactions up to and including this date
          const transactionsUpToDate = allTransactions.filter(item => {
            const itemDate = formatIndonesiaDate(new Date(item.date))
            return itemDate <= dateString
          })
          
          // Calculate wallet balance from all transactions up to this date
          runningWalletBalance = transactionsUpToDate.reduce((balance, item) => {
            const amount = parseFloat(item.amount.toString())
            if (item.type === 'income') {
              return balance + amount
            } else {
              return balance - amount
            }
          }, 0)
          
          // Total assets = wallet balance only (no savings)
          dailyValue = runningWalletBalance
          
          if (dateString === '2024-10-23' || dateString === '2024-10-24' || dateString === '2025-10-23' || dateString === '2025-10-24') {
            const todayTransactions = transactionsUpToDate.filter(t => 
              formatIndonesiaDate(new Date(t.date)) === dateString
            )
            console.log(`📊 ${dateString}:`)
            console.log(`  Transactions today:`, todayTransactions.map(t => `${t.type}: ${t.amount}`))
            console.log(`  Running wallet balance: ${runningWalletBalance}`)
            console.log(`  Total assets: ${dailyValue}`)
          }
        } else {
          // For income, expenses, savings - calculate daily amounts
          if (dataType === 'income') {
            dailyIncome = income
              .filter(item => {
                const itemDate = formatIndonesiaDate(new Date(item.date))
                // Exclude initial wallet balance transactions
                const isInitialBalance = item.description && (
                  item.description.toLowerCase().includes('initial balance') ||
                  item.description.toLowerCase().includes('wallet creation') ||
                  item.description.toLowerCase().includes('starting balance')
                )
                return itemDate === dateString && !isInitialBalance
              })
              .reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0)
            dailyValue = dailyIncome
          } else if (dataType === 'expense') {
            dailyExpenses = expenses
              .filter(item => {
                const itemDate = formatIndonesiaDate(new Date(item.date))
                return itemDate === dateString
              })
              .reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0)
            dailyValue = dailyExpenses
          } else if (dataType === 'savings') {
            dailySavings = savings
              .filter(item => {
                const itemDate = formatIndonesiaDate(new Date(item.date))
                return itemDate === dateString
              })
              .reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0)
            dailyValue = dailySavings
          }
        }
        
        return {
          date: displayDate,
          fullDate: dateString,
          value: Math.max(0, dataType === 'total_assets' ? dailyValue : dailyValue / 1000), // Don't convert assets to thousands
          income: dailyIncome,
          expenses: dailyExpenses,
          savings: dailySavings,
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
  }, [timeRange, dataType, state.data.wallets, state.data.savings, state.data.income, state.data.expenses])

  // Calculate data when component mounts or when filters change
  React.useEffect(() => {
    if (!state.loading.initial) {
      setLoading(true)
      calculateAnalyticsData()
    }
  }, [timeRange, dataType, state.loading.initial, calculateAnalyticsData])

  // Refresh data when context data changes (like other components)
  React.useEffect(() => {
    // Only refresh if we have data and it's not the initial load
    if (!state.loading.initial && !loading && (state.data.wallets?.length > 0 || state.data.savings?.length > 0)) {
      setIsUpdating(true)
      calculateAnalyticsData()
    }
  }, [state.data.wallets, state.data.savings, state.data.expenses, state.data.income, state.loading.initial, loading])

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
      <CardHeader className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 space-y-0 border-b border-neutral-200 dark:border-transparent flex-shrink-0 ${
        widgetSize === 'square' ? 'py-2 px-3' : 'py-3 px-4 sm:px-6'
      }`}>
        <div className="grid flex-1 gap-1 min-w-0 w-full sm:w-auto">
          <CardTitle className={`text-neutral-900 dark:text-neutral-100 ${
            widgetSize === 'square' ? 'text-xs sm:text-sm' :
            widgetSize === 'half' ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
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
        <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger
              className={`${
                widgetSize === 'square' ? 'w-[80px] sm:w-[90px]' : 'w-[100px] sm:w-[120px]'
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
                widgetSize === 'square' ? 'w-[60px] sm:w-[70px]' : 'w-[80px] sm:w-[100px]'
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
        widgetSize === 'square' ? 'p-2' : 'p-2 sm:p-3'
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
              widgetSize === 'square' ? 'mb-1 sm:mb-2' : 'mb-2 sm:mb-3'
            }`}
          >
            <AreaChart 
              data={analyticsData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
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
              tickMargin={4}
              minTickGap={16}
              stroke="#64748b"
              fontSize={9}
              tickFormatter={(value) => {
                // Since we're already formatting the date in the data transformation,
                // we can just return the value as is
                return value
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              stroke="#64748b"
              fontSize={8}
              domain={[yAxisMin, yAxisMax]}
              tickFormatter={(value) => {
                return formatYAxisValue(dataType === 'total_assets' ? value : value * 1000)
              }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                
                const entry = payload[0];
                const data = entry.payload;
                
                // Format the full date for display using Indonesia timezone
                const formatDate = (dateString: string) => {
                  try {
                    // Parse date string as local date to avoid timezone issues
                    const [year, month, day] = dateString.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'Asia/Jakarta'
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
                  <div className={`${bgColor} text-white rounded-lg shadow-lg p-2 sm:p-3 min-w-[150px] sm:min-w-[200px]`}>
                    <div className="text-xs opacity-90 mb-1">
                      {data?.fullDate ? formatDate(data.fullDate) : label}
                    </div>
                    <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                      {formatCurrency(dataType === 'total_assets' ? Number(entry.value) : Number(entry.value) * 1000)}
                    </div>
                    <div className="text-xs opacity-80 mb-1 sm:mb-2">
                      {dataType === 'total_assets' ? 'Assets' :
                       dataType === 'savings' ? 'Savings' :
                       dataType === 'expense' ? 'Expenses' :
                       dataType === 'income' ? 'Income' : 'Assets'}
                    </div>
                    
                    {/* Show top 3 expense categories for expense charts */}
                    {isExpense && data?.top_expenses && data.top_expenses.length > 0 && (
                      <div className="border-t border-white/20 pt-1 sm:pt-2 mt-1 sm:mt-2">
                        <div className="text-xs opacity-90 mb-1">Top Categories:</div>
                        {data.top_expenses.slice(0, 3).map((category: {category: string, amount: number}, index: number) => (
                          <div key={index} className="text-xs opacity-80 flex justify-between">
                            <span className="truncate max-w-[80px] sm:max-w-[120px]" title={category.category}>
                              {category.category}
                            </span>
                            <span className="ml-1 sm:ml-2">
                              {formatCurrency(category.amount)}
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



