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

// Interface for income vs expense trends data
interface FinancialTrendData {
  date: string;
  income: number;
  expenses: number;
  net: number;
}


const chartConfig = {
  income: {
    label: "Income",
    color: "#10b981", // emerald green
  },
  expenses: {
    label: "Expenses",
    color: "#ef4444", // red
  },
  net: {
    label: "Net (Income - Expenses)",
    color: "#3b82f6", // blue
  },
} satisfies ChartConfig

interface TrendsChartProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function TrendsChart({ widgetSize = 'half' }: TrendsChartProps) {
  const { fetchTrends, state } = useFinancialData()
  const [timeRange, setTimeRange] = React.useState("current_month")
  const [trendsData, setTrendsData] = React.useState<FinancialTrendData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch trends data
  const fetchTrendsData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await fetchTrends(timeRange)
      setTrendsData(data)
    } catch (err) {
      setError('Failed to fetch trends data')
      console.error('Error fetching trends data:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange, fetchTrends])

  // Fetch data on component mount, when time range changes, or when transactions are updated
  React.useEffect(() => {
    fetchTrendsData()
  }, [fetchTrendsData, state.data.lastUpdated.transactions])

  // Calculate totals for trend analysis
  const totalIncome = trendsData.reduce((sum, day) => sum + day.income, 0)
  const totalExpenses = trendsData.reduce((sum, day) => sum + day.expenses, 0)
  const totalNet = totalIncome - totalExpenses
  
  const avgDailyIncome = trendsData.length > 0 ? totalIncome / trendsData.length : 0
  const avgDailyExpense = trendsData.length > 0 ? totalExpenses / trendsData.length : 0
  const avgDailyNet = trendsData.length > 0 ? totalNet / trendsData.length : 0

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardHeader className={`flex items-center gap-2 space-y-0 border-b border-slate-200 dark:border-slate-700 sm:flex-row flex-shrink-0 ${
        widgetSize === 'square' ? 'py-2 px-3' : 'py-3 px-6'
      }`}>
        <div className="grid flex-1 gap-1 min-w-0">
          <CardTitle className={`text-slate-900 dark:text-white ${
            widgetSize === 'square' ? 'text-sm' :
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } truncate`}>Income vs Expenses</CardTitle>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className={`${
              widgetSize === 'square' ? 'w-[100px]' : 'w-[140px]'
            } rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-shrink-0`}
            aria-label="Select time range"
          >
            <SelectValue placeholder="This Month" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectItem value="current_month" className="rounded-lg text-xs">
              {widgetSize === 'square' ? 'This Month' : 'This Month'}
            </SelectItem>
            <SelectItem value="last_month" className="rounded-lg text-xs">
              {widgetSize === 'square' ? 'Last Month' : 'Last Month'}
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg text-xs">
              {widgetSize === 'square' ? '7d' : '7 days'}
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg text-xs">
              {widgetSize === 'square' ? '30d' : '30 days'}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className={`flex-1 flex flex-col overflow-hidden ${
        widgetSize === 'square' ? 'p-2' : 'p-3'
      }`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-slate-600 dark:text-slate-300">Loading trends...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-red-600 dark:text-red-400">Error: {error}</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={`flex-1 min-h-0 ${
              widgetSize === 'square' ? 'mb-2' : 'mb-3'
            }`}
          >
            <AreaChart 
              data={trendsData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
            <defs>
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
                const date = new Date(value)
                return date.toLocaleDateString("id-ID", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(value) => {
                if (widgetSize === 'square') {
                  return new Intl.NumberFormat('id-ID', { 
                    notation: 'compact', 
                    style: 'currency', 
                    currency: 'IDR',
                    maximumFractionDigits: 0
                  }).format(value);
                }
                return new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0
                }).format(value);
              }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 min-w-[200px]">
                    <div className="font-medium text-slate-900 dark:text-white mb-2">
                      {new Date(label).toLocaleDateString("id-ID", {
                        weekday: "short",
                        month: "short", 
                        day: "numeric",
                      })}
                    </div>
                    <div className="space-y-1">
                      {payload
                        .filter(entry => Number(entry.value) > 0)
                        .sort((a, b) => Number(b.value) - Number(a.value))
                        .map((entry, index) => {
                          const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
                          const color = (config && 'color' in config) ? config.color : '#6b7280';
                          return (
                            <div key={index} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                  {config?.label || entry.dataKey}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {formatCurrency(Number(entry.value))}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="income"
              type="monotone"
              fill="url(#fillIncome)"
              stroke="var(--color-income)"
              strokeWidth={2}
              fillOpacity={0.6}
            />
            <Area
              dataKey="expenses"
              type="monotone"
              fill="url(#fillExpenses)"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              fillOpacity={0.6}
            />
            </AreaChart>
          </ChartContainer>
        )}

        {/* Summary Stats */}
        <div className={`grid grid-cols-3 gap-2 flex-shrink-0 ${
          widgetSize === 'square' ? 'min-h-0' : ''
        }`}>
          <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg ${
            widgetSize === 'square' ? 'p-1.5' : 'p-2'
          }`}>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-xs'
            } text-green-700 dark:text-green-300 mb-1 truncate`}>
              Income
            </div>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-sm'
            } font-bold text-green-800 dark:text-green-200`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(totalIncome) :
                formatCurrency(totalIncome)
              }
            </div>
          </div>
          <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${
            widgetSize === 'square' ? 'p-1.5' : 'p-2'
          }`}>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-xs'
            } text-red-700 dark:text-red-300 mb-1 truncate`}>
              Expenses
            </div>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-sm'
            } font-bold text-red-800 dark:text-red-200`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(totalExpenses) :
                formatCurrency(totalExpenses)
              }
            </div>
          </div>
          <div className={`${
            totalNet >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
          } rounded-lg ${
            widgetSize === 'square' ? 'p-1.5' : 'p-2'
          }`}>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-xs'
            } ${
              totalNet >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
            } mb-1 truncate`}>
              Net
            </div>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-sm'
            } font-bold ${
              totalNet >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'
            }`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(totalNet) :
                formatCurrency(totalNet)
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



