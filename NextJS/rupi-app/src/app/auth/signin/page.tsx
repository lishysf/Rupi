'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        // Check if session was created successfully
        const session = await getSession();
        if (session && session.user?.name) {
          const completed = (session.user as any).onboardingCompleted === true;
          if (!completed) {
            router.push('/onboarding');
          } else {
            router.push(`/${session.user.name}/dashboard`);
          }
          router.refresh();
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-sm placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-neutral-700 dark:text-neutral-100"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">Sign up</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
