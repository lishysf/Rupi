'use client';

import { useEffect, useState, Suspense } from 'react';
import { signIn, useSession, getSession } from 'next-auth/react';

function LinkTelegramInner() {
  const { data: session, status } = useSession();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogle = async () => {
    await signIn('google', { callbackUrl: `${window.location.origin}/link-telegram` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/telegram/link/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim() })
      });
      const json = await res.json();
      if (json.ok) {
        // Redirect to success page with countdown
        window.location.href = '/link-telegram/success';
      } else {
        setMessage(json.error || '❌ Invalid or expired code.');
        setSubmitting(false);
      }
    } catch {
      setMessage('❌ Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Link Telegram</h1>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Link Telegram</h1>
        {status === 'unauthenticated' || !session ? (
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Sign in with Google to continue.</p>
            <button onClick={handleGoogle} className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">Continue with Google</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-1">Enter 6-digit code</label>
              <input value={code} onChange={(e)=>setCode(e.target.value.replace(/[^0-9]/g,''))} maxLength={6} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100" placeholder="123456" />
            </div>
            <button disabled={submitting || code.length !== 6} className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white">{submitting ? 'Linking...' : 'Link'}</button>
            {message && <p className="text-sm mt-2 text-neutral-700 dark:text-neutral-300">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default function LinkTelegramPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-600 dark:text-neutral-300">Loading…</div>}>
      <LinkTelegramInner />
    </Suspense>
  );
}


