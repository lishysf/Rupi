'use client';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showChart?: boolean;
  showTable?: boolean;
}

export default function LoadingSkeleton({ 
  className = '', 
  lines = 3, 
  showAvatar = false,
  showChart = false,
  showTable = false
}: LoadingSkeletonProps) {
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
