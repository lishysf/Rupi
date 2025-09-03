'use client';

import { Pie, PieChart, Cell } from "recharts"

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

interface CategoryBreakdownProps {
  widgetSize?: 'square' | 'half' | 'long';
}

export default function CategoryBreakdown({ widgetSize = 'square' }: CategoryBreakdownProps) {
  // Mock data for category breakdown with specific colors
  const chartData = [
    { category: "Food", amount: 2500000, fill: "#10b981" }, // emerald
    { category: "Transport", amount: 1200000, fill: "#3b82f6" }, // blue
    { category: "Bills", amount: 800000, fill: "#f59e0b" }, // amber
    { category: "Entertainment", amount: 600000, fill: "#8b5cf6" }, // violet
    { category: "Shopping", amount: 450000, fill: "#ef4444" }, // red
    { category: "Coffee", amount: 280000, fill: "#6b7280" }, // gray
  ];

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
