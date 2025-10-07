'use client';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showChart?: boolean;
  showTable?: boolean;
  type?: 'balance-overview' | 'financial-summary' | 'income-expense' | 'category-breakdown' | 'trends-chart' | 'recent-transactions' | 'budget-tracking' | 'savings-goals' | 'financial-health' | 'ai-insights';
}

export default function LoadingSkeleton({ 
  className = '', 
  lines = 3, 
  showAvatar = false,
  showChart = false,
  showTable = false,
  type
}: LoadingSkeletonProps) {
  // Balance Overview Skeleton
  if (type === 'balance-overview') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shadow-xl border border-slate-300/20 dark:border-slate-600/20">
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-slate-400/50 rounded-full mr-3"></div>
                <div className="w-24 h-5 bg-slate-400/50 rounded"></div>
              </div>
              <div className="w-20 h-6 bg-slate-400/50 rounded-full"></div>
            </div>
            
            {/* Main Balance */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-4">
                <div className="w-32 h-8 bg-slate-400/50 rounded mx-auto mb-2"></div>
                <div className="w-24 h-6 bg-slate-400/50 rounded mx-auto"></div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-400/30 rounded-full h-2 mb-2">
                <div className="bg-slate-400/60 h-2 rounded-full w-3/4"></div>
              </div>
              <div className="text-center">
                <div className="w-20 h-4 bg-slate-400/50 rounded mx-auto"></div>
              </div>
            </div>
            
            {/* Bottom Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="w-16 h-5 bg-slate-400/50 rounded mx-auto mb-1"></div>
                <div className="w-12 h-4 bg-slate-400/50 rounded mx-auto"></div>
              </div>
              <div className="text-center">
                <div className="w-16 h-5 bg-slate-400/50 rounded mx-auto mb-1"></div>
                <div className="w-12 h-4 bg-slate-400/50 rounded mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Financial Summary Skeleton
  if (type === 'financial-summary') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Income/Expense Skeleton
  if (type === 'income-expense') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chart Skeleton (Trends Chart, Category Breakdown)
  if (type === 'trends-chart' || type === 'category-breakdown') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Recent Transactions Skeleton
  if (type === 'recent-transactions') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                  <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Budget Tracking Skeleton
  if (type === 'budget-tracking') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-slate-300 dark:bg-slate-600 h-2 rounded-full w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Savings Goals Skeleton
  if (type === 'savings-goals') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-slate-300 dark:bg-slate-600 h-2 rounded-full w-1/2"></div>
                </div>
                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Financial Health Skeleton
  if (type === 'financial-health') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-28 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2"></div>
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>
          </div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // AI Insights Skeleton
  if (type === 'ai-insights') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                <div className="w-3/4 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
            <div className="w-full h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-5/6 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-4/6 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to original skeleton
  return (
    <div className={`animate-pulse ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          </div>
        </div>
      )}
      
      {showChart && (
        <div className="mb-4">
          <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
      )}
      
      {showTable && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      )}
      
      {!showChart && !showTable && (
        <div className="space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded" style={{
              width: `${Math.random() * 40 + 60}%`
            }}></div>
          ))}
        </div>
      )}
    </div>
  );
}
