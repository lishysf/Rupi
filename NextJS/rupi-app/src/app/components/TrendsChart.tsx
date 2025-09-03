'use client';

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

// Mock expense data for Rupi - Indonesian Rupiah amounts
const expenseData = [
  { date: "2024-01-01", food: 250000, transport: 120000, entertainment: 80000 },
  { date: "2024-01-02", food: 180000, transport: 95000, entertainment: 60000 },
  { date: "2024-01-03", food: 220000, transport: 110000, entertainment: 90000 },
  { date: "2024-01-04", food: 290000, transport: 140000, entertainment: 120000 },
  { date: "2024-01-05", food: 320000, transport: 160000, entertainment: 100000 },
  { date: "2024-01-06", food: 280000, transport: 130000, entertainment: 85000 },
  { date: "2024-01-07", food: 240000, transport: 100000, entertainment: 70000 },
  { date: "2024-01-08", food: 350000, transport: 180000, entertainment: 140000 },
  { date: "2024-01-09", food: 200000, transport: 90000, entertainment: 50000 },
  { date: "2024-01-10", food: 270000, transport: 125000, entertainment: 95000 },
  { date: "2024-01-11", food: 310000, transport: 155000, entertainment: 110000 },
  { date: "2024-01-12", food: 260000, transport: 115000, entertainment: 80000 },
  { date: "2024-01-13", food: 330000, transport: 170000, entertainment: 130000 },
  { date: "2024-01-14", food: 190000, transport: 85000, entertainment: 65000 },
  { date: "2024-01-15", food: 280000, transport: 135000, entertainment: 90000 },
  { date: "2024-01-16", food: 240000, transport: 105000, entertainment: 75000 },
  { date: "2024-01-17", food: 360000, transport: 185000, entertainment: 145000 },
  { date: "2024-01-18", food: 300000, transport: 150000, entertainment: 115000 },
  { date: "2024-01-19", food: 220000, transport: 95000, entertainment: 70000 },
  { date: "2024-01-20", food: 250000, transport: 120000, entertainment: 85000 },
  { date: "2024-01-21", food: 180000, transport: 80000, entertainment: 55000 },
  { date: "2024-01-22", food: 290000, transport: 145000, entertainment: 100000 },
  { date: "2024-01-23", food: 270000, transport: 130000, entertainment: 90000 },
  { date: "2024-01-24", food: 340000, transport: 175000, entertainment: 125000 },
  { date: "2024-01-25", food: 210000, transport: 100000, entertainment: 65000 },
  { date: "2024-01-26", food: 320000, transport: 160000, entertainment: 110000 },
  { date: "2024-01-27", food: 280000, transport: 140000, entertainment: 95000 },
  { date: "2024-01-28", food: 260000, transport: 125000, entertainment: 80000 },
  { date: "2024-01-29", food: 380000, transport: 190000, entertainment: 150000 },
  { date: "2024-01-30", food: 230000, transport: 110000, entertainment: 75000 },
]

const chartConfig = {
  totalExpenses: {
    label: "Total Expenses",
  },
  food: {
    label: "Food",
    color: "#10b981", // emerald - matches CategoryBreakdown
  },
  transport: {
    label: "Transport", 
    color: "#3b82f6", // blue - matches CategoryBreakdown
  },
  entertainment: {
    label: "Entertainment",
    color: "#8b5cf6", // violet - matches CategoryBreakdown
  },
} satisfies ChartConfig

interface TrendsChartProps {
  widgetSize?: 'square' | 'half' | 'long';
}

export default function TrendsChart({ widgetSize = 'half' }: TrendsChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredData = expenseData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-01-30")
    let daysToSubtract = 30
    if (timeRange === "7d") {
      daysToSubtract = 7
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  // Calculate total expenses for trend analysis
  const totalExpenses = filteredData.reduce((sum, day) => 
    sum + day.food + day.transport + day.entertainment, 0
  )
  
  const avgDailyExpense = totalExpenses / filteredData.length

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardHeader className={`flex items-center gap-2 space-y-0 border-b border-slate-200 dark:border-slate-700 sm:flex-row flex-shrink-0 ${
        widgetSize === 'square' ? 'py-2 px-3' : 'py-3 px-6'
      }`}>
        <div className="grid flex-1 gap-1 min-w-0">
          <CardTitle className={`text-slate-900 dark:text-white ${
            widgetSize === 'square' ? 'text-sm' :
            widgetSize === 'half' ? 'text-base' : 'text-lg'
          } truncate`}>Expense Trends</CardTitle>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className={`${
              widgetSize === 'square' ? 'w-[80px]' : 'w-[120px]'
            } rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-shrink-0`}
            aria-label="Select time range"
          >
            <SelectValue placeholder="30d" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectItem value="7d" className="rounded-lg text-xs">
              {widgetSize === 'square' ? '7d' : '7 days'}
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg text-xs">
              {widgetSize === 'square' ? '30d' : '30 days'}
            </SelectItem>
            <SelectItem value="90d" className="rounded-lg text-xs">
              {widgetSize === 'square' ? '90d' : '3 months'}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className={`flex-1 flex flex-col overflow-hidden ${
        widgetSize === 'square' ? 'p-2' : 'p-3'
      }`}>
        <ChartContainer
          config={chartConfig}
          className={`flex-1 min-h-0 ${
            widgetSize === 'square' ? 'mb-2' : 'mb-3'
          }`}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillFood" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-food)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-food)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTransport" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-transport)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-transport)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillEntertainment" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-entertainment)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-entertainment)"
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("id-ID", {
                      weekday: "short",
                      month: "short", 
                      day: "numeric",
                    })
                  }}
                  valueFormatter={(value) => formatCurrency(Number(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="entertainment"
              type="natural"
              fill="url(#fillEntertainment)"
              stroke="var(--color-entertainment)"
              stackId="a"
            />
            <Area
              dataKey="transport" 
              type="natural"
              fill="url(#fillTransport)"
              stroke="var(--color-transport)"
              stackId="a"
            />
            <Area
              dataKey="food"
              type="natural"
              fill="url(#fillFood)"
              stroke="var(--color-food)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>

        {/* Summary Stats */}
        <div className={`grid grid-cols-2 gap-2 flex-shrink-0 ${
          widgetSize === 'square' ? 'min-h-0' : ''
        }`}>
          <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-lg ${
            widgetSize === 'square' ? 'p-1.5' : 'p-2'
          }`}>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-xs'
            } text-slate-600 dark:text-slate-300 mb-1 truncate`}>
              Total ({timeRange})
            </div>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-sm'
            } font-bold text-slate-900 dark:text-white`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(totalExpenses) :
                formatCurrency(totalExpenses)
              }
            </div>
          </div>
          <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-lg ${
            widgetSize === 'square' ? 'p-1.5' : 'p-2'
          }`}>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-xs'
            } text-slate-600 dark:text-slate-300 mb-1 truncate`}>
              Daily Avg
            </div>
            <div className={`${
              widgetSize === 'square' ? 'text-xs' : 'text-sm'
            } font-bold text-slate-900 dark:text-white`}>
              {widgetSize === 'square' ? 
                new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(avgDailyExpense) :
                formatCurrency(avgDailyExpense)
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
