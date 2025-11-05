'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LinkTelegramSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Successfully Linked!
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Your Telegram account has been linked to your Fundy account.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Redirecting to home in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Go to Home Now
        </button>
      </div>
    </div>
  );
}

