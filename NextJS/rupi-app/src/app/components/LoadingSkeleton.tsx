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
  // Balance Overview Skeleton - simple neutral colors
  if (type === 'balance-overview') {
    return (
      <div className={`animate-pulse h-48 sm:h-56 ${className}`}>
        <div className="h-full bg-neutral-200 dark:bg-neutral-700 rounded-3xl p-4 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full mr-3"></div>
              <div>
                <div className="w-20 h-4 bg-neutral-300 dark:bg-neutral-600 rounded mb-1"></div>
                <div className="w-24 h-3 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-300 dark:bg-neutral-600 rounded-lg"></div>
              <div className="w-20 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-32 h-4 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
                <div className="flex items-center">
                  <div className="w-16 h-3 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
                </div>
              </div>
              <div className="w-48 h-9 bg-neutral-300 dark:bg-neutral-600 rounded mb-3"></div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-neutral-300 dark:bg-neutral-600 rounded mr-2"></div>
                <div className="w-40 h-4 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Financial Summary Skeleton - simple neutral colors
  if (type === 'financial-summary') {
    return (
      <div className={`animate-pulse h-48 sm:h-56 ${className}`}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent h-full flex flex-col p-4">
          <div className="h-full flex flex-col space-y-4">
            {/* Top Section */}
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
            <div className="w-40 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-32 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            
            {/* Bottom Section */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                <div className="flex items-center mb-2">
                  <div className="w-1.5 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mr-2"></div>
                  <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="w-28 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Income/Expense Skeleton - simple neutral colors
  if (type === 'income-expense') {
    return (
      <div className={`animate-pulse h-56 sm:h-56 ${className}`}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent h-full flex flex-col p-4">
          <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-700 rounded mb-4"></div>
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-24 h-24 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            <div className="space-y-3 w-full">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                  <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                  <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chart Skeleton (Trends Chart, Category Breakdown) - simple neutral colors
  if (type === 'trends-chart' || type === 'category-breakdown') {
    const heightClass = type === 'trends-chart' ? 'h-80 sm:h-72 lg:h-80' : 'h-90 sm:h-72 lg:h-80';
    return (
      <div className={`animate-pulse ${heightClass} ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-20 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
          </div>
          <div className="flex justify-center mt-4 space-x-3">
            <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Recent Transactions Skeleton - simple neutral colors
  if (type === 'recent-transactions') {
    return (
      <div className={`animate-pulse h-80 sm:h-72 lg:h-80 ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-transparent p-3 sm:p-4 lg:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
            <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                  <div className="w-20 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Budget Tracking Skeleton - simple neutral colors
  if (type === 'budget-tracking') {
    return (
      <div className={`animate-pulse h-90 sm:h-72 lg:h-80 ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="w-24 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3"></div>
                <div className="flex justify-between">
                  <div className="w-12 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Savings Goals Skeleton - simple neutral colors
  if (type === 'savings-goals') {
    return (
      <div className={`animate-pulse h-90 sm:h-72 lg:h-80 ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="w-24 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
                    <div>
                      <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                      <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3"></div>
                  <div className="flex justify-between">
                    <div className="w-20 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                    <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Financial Health Skeleton - simple neutral colors
  if (type === 'financial-health') {
    return (
      <div className={`animate-pulse h-60 sm:h-56 ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-6 flex flex-col">
          <div className="flex items-center mb-4 flex-shrink-0">
            <div className="w-28 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mb-4">
            <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-4"></div>
            <div className="w-16 h-6 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
            <div className="w-12 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // AI Insights Skeleton - simple neutral colors
  if (type === 'ai-insights') {
    return (
      <div className={`animate-pulse h-64 sm:h-72 lg:h-80 ${className}`}>
        <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-20 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
              <div className="flex-1">
                <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                <div className="w-3/4 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            </div>
            <div className="w-full h-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-5/6 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-4/6 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple fallback skeleton with neutral colors
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent p-6 h-full flex flex-col">
        {showAvatar && (
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24"></div>
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
            </div>
          </div>
        )}
        
        {showChart && (
          <div className="mb-6">
            <div className="w-full h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            <div className="flex justify-center mt-4 space-x-2">
              <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
          </div>
        )}
        
        {showTable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-20 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </div>
            ))}
          </div>
        )}
        
        {!showChart && !showTable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-24 h-6 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" style={{
                      width: `${Math.random() * 40 + 60}%`
                    }}></div>
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
                  </div>
                  <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
