'use client';

import { Heart, TrendingUp, Activity, PiggyBank } from 'lucide-react';

interface FinancialHealthScoreProps {
  widgetSize?: 'square' | 'half' | 'medium' | 'long';
}

export default function FinancialHealthScore({ widgetSize = 'square' }: FinancialHealthScoreProps) {
  // Mock financial health data
  const healthScore = 72; // Score out of 100
  const previousScore = 68;
  const scoreChange = healthScore - previousScore;

  // Mascot expressions based on score
  const getMascotExpression = (score: number) => {
    if (score >= 80) return { emoji: '😊', status: 'Excellent' };
    if (score >= 60) return { emoji: '🙂', status: 'Good' };
    if (score >= 40) return { emoji: '😐', status: 'Fair' };
    return { emoji: '😟', status: 'Needs Work' };
  };

  const mascot = getMascotExpression(healthScore);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Health factors
  const factors = [
    { name: 'Savings', score: 85, icon: PiggyBank },
    { name: 'Budget', score: 68, icon: Activity },
    { name: 'Consistency', score: 72, icon: TrendingUp },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
      <div className="flex items-center mb-4 flex-shrink-0">
        <Heart className="w-5 h-5 text-red-500 mr-2" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Financial Health
        </h2>
      </div>

      {/* Main Content - Responsive Layout */}
      {widgetSize === 'square' ? (
        // Square Layout - Optimized for square widget
        <div className="flex-1 flex flex-col justify-between">
          {/* Top: Score and Mascot - Horizontal */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-1">{mascot.emoji}</div>
              <div className={`text-xl font-bold ${getScoreColor(healthScore)}`}>
                {healthScore}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                out of 100
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                Status
              </div>
              <div className={`text-sm font-medium ${getScoreColor(healthScore)}`}>
                {mascot.status}
              </div>
              <div className={`text-xs font-medium ${
                scoreChange >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange}
              </div>
            </div>
          </div>

          {/* Bottom: Contributing Factors */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Contributing Factors
            </h3>
            <div className="space-y-3">
              {factors.map((factor, index) => {
                const IconComponent = factor.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconComponent className="w-3 h-3 text-slate-500 dark:text-slate-400 mr-2" />
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {factor.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-10 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full ${getProgressColor(factor.score)}`}
                          style={{ width: `${factor.score}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getScoreColor(factor.score)} w-6 text-right`}>
                        {factor.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Half and Long Layouts
        <div className={`flex-1 flex ${
          widgetSize === 'half' ? 'items-center gap-6' : 'flex-col space-y-4'
        }`}>
          {/* Score and Mascot */}
          <div className={`${
            widgetSize === 'long' ? 'flex items-center gap-6' : 'flex-1'
          } text-center`}>
            <div className={`${
              widgetSize === 'half' ? 'text-4xl mb-3' : 'text-5xl mb-0'
            }`}>{mascot.emoji}</div>
            <div className={widgetSize === 'long' ? 'text-left' : ''}>
              <div className={`${
                widgetSize === 'half' ? 'text-2xl' : 'text-3xl'
              } font-bold mb-1 ${getScoreColor(healthScore)}`}>
                {healthScore}
              </div>
              <div className={`${
                widgetSize === 'half' ? 'text-sm' : 'text-base'
              } text-slate-500 dark:text-slate-400 mb-1`}>
                out of 100
              </div>
              <div className={`text-sm font-medium ${
                scoreChange >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange} this month
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="flex-1 space-y-3">
            <h3 className={`${
              widgetSize === 'half' ? 'text-sm' : 'text-base'
            } font-medium text-slate-600 dark:text-slate-300 mb-2`}>
              Contributing Factors
            </h3>
            {factors.map((factor, index) => {
              const IconComponent = factor.icon;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <IconComponent className={`${
                      widgetSize === 'half' ? 'w-4 h-4' : 'w-5 h-5'
                    } text-slate-500 dark:text-slate-400 mr-2`} />
                    <span className={`${
                      widgetSize === 'half' ? 'text-sm' : 'text-base'
                    } text-slate-700 dark:text-slate-200`}>
                      {factor.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className={`${
                      widgetSize === 'half' ? 'w-12' : 'w-16'
                    } bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2`}>
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(factor.score)}`}
                        style={{ width: `${factor.score}%` }}
                      ></div>
                    </div>
                    <span className={`${
                      widgetSize === 'half' ? 'text-sm w-6' : 'text-base w-8'
                    } font-medium ${getScoreColor(factor.score)} text-right`}>
                      {factor.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score Progress Bar - Only for non-square */}
      {widgetSize !== 'square' && (
        <div className="flex-shrink-0">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300">Status</span>
            <span className={`font-medium ${getScoreColor(healthScore)}`}>
              {mascot.status}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(healthScore)}`}
              style={{ width: `${healthScore}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
