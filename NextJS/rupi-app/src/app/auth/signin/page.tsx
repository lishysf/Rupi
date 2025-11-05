'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tgLinkToken = searchParams.get('tg_link');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // OAuth providers need to redirect, so we'll let NextAuth handle the redirect
      // After redirect, the user will be redirected back to our callback URL
      const base = `${window.location.origin}/auth/signin`;
      const callbackUrl = tgLinkToken ? `${base}?tg_link=${encodeURIComponent(tgLinkToken)}` : base;
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // After login, if tg_link is present, auto-consume to link telegram
  useEffect(() => {
    getSession().then(async (session) => {
      if (session && session.user?.name) {
        if (tgLinkToken) {
          try {
            await fetch('/api/telegram/link/consume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: tgLinkToken })
            });
          } catch {}
        }
        const completed = (session.user as any).onboardingCompleted === true;
        if (!completed) {
          router.push('/onboarding');
        } else {
          router.push(`/${session.user.name}/dashboard`);
        }
      }
    });
  }, [router, tgLinkToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                New
                <span className="text-emerald-600 dark:text-emerald-300">Budgeting made simple</span>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Take control of your money with clarity and confidence
            </h1>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400 max-w-prose">
              Fundy helps you track spending, plan budgets, and grow your savings. Built for everyday use with a clean, fast, and private experience.
            </p>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Smart budgets</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Plan and stick to goals that adapt to you.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Clear insights</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Understand trends without spreadsheets.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Fast and private</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">No clutter, your data stays yours.</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">Works on any device</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">Responsive and accessible by design.</div>
                </div>
              </li>
            </ul>
            <div className="mt-8">
              <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Trusted by users from</div>
              <div className="flex items-center gap-6 opacity-70">
                <div className="h-6 w-16 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
                <div className="h-6 w-16 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
                <div className="h-6 w-16 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 max-w-md w-full lg:ml-auto">
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 md:p-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Fundy</div>
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Welcome back</h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Sign in to continue</p>
              </div>
              <div className="mt-8 space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-neutral-300 dark:border-neutral-600 text-sm font-medium rounded-lg text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">Secure authentication</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
