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
}


const chartConfig = {
  value: {
    label: "Value",
    color: "#10b981", // emerald-500 - Fundy green
  },
} satisfies ChartConfig

interface TrendsChartProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function TrendsChart({ widgetSize = 'half' }: TrendsChartProps) {
  const { fetchTrends, state } = useFinancialData()
  const [timeRange, setTimeRange] = React.useState("month")
  const [dataType, setDataType] = React.useState("savings")
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData[]>([])
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

  // Fetch real analytics data from API
  const fetchAnalyticsData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Map timeRange to API format
      const apiRange = timeRange === 'week' ? '7d' : 'current_month'
      
      const response = await fetch(`/api/expenses/trends?range=${apiRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trends data')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trends data')
      }
      
      // Debug: Log the received data
      console.log('Trends API response for', timeRange, ':', result.data)
      
      // Handle empty data case
      if (!result.data || result.data.length === 0) {
        console.log('No trends data available')
        setAnalyticsData([])
        return
      }
      
      // Ensure we have at least 2 data points for proper chart rendering
      if (result.data.length === 1) {
        console.log('Only 1 data point available, duplicating for chart visibility')
        const singlePoint = result.data[0]
        result.data.push({
          ...singlePoint,
          date: new Date(new Date(singlePoint.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Add 1 day
        })
      }
      
      // Transform API data to chart format
      const transformedData = result.data.map((item: any) => {
        // Handle date parsing more safely
        let date: Date
        try {
          // Try parsing the date string directly
          date = new Date(item.date)
          
          // Check if the date is valid
          if (isNaN(date.getTime())) {
            // If invalid, try parsing as ISO string
            date = new Date(item.date + 'T00:00:00')
            if (isNaN(date.getTime())) {
              console.warn('Invalid date:', item.date)
              date = new Date() // Fallback to current date
            }
          }
        } catch (error) {
          console.warn('Date parsing error:', error, 'for date:', item.date)
          date = new Date() // Fallback to current date
        }
        
        let displayDate: string
        
        if (timeRange === 'week') {
          // For weekly view, show actual dates (MM/DD format)
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          displayDate = `${month}/${day}`
        } else {
          // For monthly view, show actual dates (MM/DD format)
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          displayDate = `${month}/${day}`
        }
        
        // Choose value based on dataType
        let value = 0
        if (dataType === 'savings') {
          value = item.net || 0 // Net savings (income - expenses)
        } else if (dataType === 'expense') {
          value = item.expenses || 0
        }
        
        // Convert to thousands for better chart display
        return {
          date: displayDate,
          fullDate: item.date, // Keep original date for tooltip
          value: Math.max(0, value / 1000) // Convert to thousands, ensure non-negative
        }
      })
      
      // Sort data by date to ensure proper chronological order
      const sortedData = transformedData.sort((a: any, b: any) => {
        const dateA = new Date(a.fullDate || a.date)
        const dateB = new Date(b.fullDate || b.date)
        return dateA.getTime() - dateB.getTime()
      })
      
      // Filter out any invalid data points
      const validData = sortedData.filter((item: any) => 
        item.value !== undefined && 
        item.value !== null && 
        !isNaN(item.value) &&
        item.date && 
        item.date.trim() !== ''
      )
      
      // For very few data points, ensure minimum visibility
      if (validData.length > 0 && validData.length < 3) {
        console.log('Few data points detected, ensuring visibility')
        // Add a small baseline value to make the chart more visible
        validData.forEach((item: any) => {
          if (item.value === 0) {
            item.value = 0.1 // Small non-zero value for visibility
          }
        })
      }
      
      // Debug: Log the transformed data
      console.log('Transformed data for chart:', validData)
      console.log('Data points count:', validData.length)
      
      setAnalyticsData(validData)
    } catch (err) {
      setError('Failed to fetch analytics data')
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange, dataType])

  // Fetch data on component mount or when filters change
  React.useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  // Calculate peak value for highlighting
  const peakValue = analyticsData.length > 0 ? Math.max(...analyticsData.map(d => d.value)) : 0
  const peakData = analyticsData.find(d => d.value === peakValue)
  
  // Calculate dynamic Y-axis domain
  const maxValue = peakValue || 100
  const minValue = analyticsData.length > 0 ? Math.min(...analyticsData.map(d => d.value)) : 0
  const yAxisMax = Math.ceil(maxValue * 1.2) // Add 20% padding for better visibility
  const yAxisMin = Math.max(0, Math.floor(minValue * 0.8)) // Add some padding below minimum

  return (
    <Card className="bg-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardHeader className={`flex items-center gap-2 space-y-0 border-b border-slate-200 dark:border-slate-700 sm:flex-row flex-shrink-0 ${
        widgetSize === 'square' ? 'py-2 px-3' : 'py-3 px-6'
      }`}>
        <div className="grid flex-1 gap-1 min-w-0">
          <CardTitle className={`text-slate-900 dark:text-white ${
            widgetSize === 'square' ? 'text-sm' :
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } truncate`}>Analytics</CardTitle>
        </div>
        <div className="flex gap-2">
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger
              className={`${
                widgetSize === 'square' ? 'w-[90px]' : 'w-[120px]'
              } rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-shrink-0 min-w-0`}
              aria-label="Select data type"
            >
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[120px]">
              <SelectItem value="savings" className="rounded-lg text-xs cursor-pointer">Savings</SelectItem>
              <SelectItem value="expense" className="rounded-lg text-xs cursor-pointer">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className={`${
                widgetSize === 'square' ? 'w-[70px]' : 'w-[100px]'
              } rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-shrink-0 min-w-0`}
              aria-label="Select time range"
            >
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[100px]">
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
            <div className="text-sm text-slate-600 dark:text-slate-300">Loading analytics...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-red-600 dark:text-red-400">Error: {error}</div>
          </div>
        ) : analyticsData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">No data available</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Start tracking expenses to see trends</div>
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
                
                return (
                  <div className="bg-emerald-600 text-white rounded-lg shadow-lg p-3 min-w-[140px] text-center">
                    <div className="text-xs opacity-90 mb-1">
                      {data?.fullDate ? formatDate(data.fullDate) : label}
                    </div>
                    <div className="text-sm font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(Number(entry.value) * 1000)}
                    </div>
                    <div className="text-xs opacity-80">
                      {dataType === 'savings' ? 'Net Savings' : 'Expenses'}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#fillValue)"
              stroke="var(--color-value)"
              strokeWidth={2}
              fillOpacity={0.6}
            />
            </AreaChart>
          </ChartContainer>
        )}

      </CardContent>
    </Card>
  );
}



