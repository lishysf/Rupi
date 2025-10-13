'use client';

import { useSession } from 'next-auth/react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useEffect, useState } from 'react';

interface GlobalLoaderProps {
  children: React.ReactNode;
}

export default function GlobalLoader({ children }: GlobalLoaderProps) {
  const { data: session, status } = useSession();

  // Only show loading screen for session authentication
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              Fundy
            </div>
            <div className="text-muted-foreground">
              Your Personal Finance Dashboard
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex flex-col items-center space-y-4">
            {/* Spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-spin border-t-emerald-600 dark:border-t-emerald-400"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-emerald-600 dark:border-t-emerald-400 opacity-20"></div>
            </div>

            {/* Loading Text */}
            <div className="text-muted-foreground text-sm">
              Authenticating...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show children when everything is loaded
  return <>{children}</>;
}
