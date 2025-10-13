'use client';

import { Brain, TrendingUp, Lightbulb, AlertTriangle } from 'lucide-react';

interface AIInsightsProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function AIInsights({ widgetSize = 'half' }: AIInsightsProps) {
  // Mock AI insights data
  const insights = [
    {
      type: 'summary',
      icon: Brain,
      title: 'Weekly Summary',
      content: 'Pengeluaran minggu ini Rp1.750.000, naik 15% dari minggu lalu.',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      type: 'suggestion',
      icon: Lightbulb,
      title: 'Smart Suggestion',
      content: 'Kurangi transportasi online 2x, bisa hemat Rp50.000/minggu.',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      type: 'highlight',
      icon: AlertTriangle,
      title: 'Budget Alert',
      content: 'Kategori kopi sudah mencapai 70% dari budget bulanan.',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    },
  ];

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            AI Insights
          </h2>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          LLaMA
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={index}
              className={`${insight.bgColor} rounded-lg p-3 border border-opacity-20`}
            >
              <div className="flex items-start">
                <div className={`${insight.color} mr-2 mt-0.5`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${insight.color} mb-1 text-sm`}>
                    {insight.title}
                  </h3>
                  <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
                    {insight.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Actions */}
      <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
        <div className="flex flex-wrap gap-1">
          <button className="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
            Budget Plan
          </button>
          <button className="px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
            Tips
          </button>
          <button className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
            Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
