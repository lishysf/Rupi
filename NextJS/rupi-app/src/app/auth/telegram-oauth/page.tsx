'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from 'next-auth/react';

function TelegramOAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [linkingComplete, setLinkingComplete] = useState(false);

  useEffect(() => {
    // Prevent any redirects while we're on this page
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid token. Please try again from Telegram.');
        return;
      }

      try {
        // Wait a bit for session cookie to be set after OAuth redirect
        let session = null;
        let attempts = 0;
        const maxAttempts = 10; // Increased attempts
        
        while (!session && attempts < maxAttempts) {
          session = await getSession();
          if (!session) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            attempts++;
          }
        }
        
        if (!session || !session.user?.id) {
          setStatus('error');
          setMessage('Session not found. Please try logging in again from Telegram.');
          return;
        }

        console.log('✅ Session found, linking Telegram account...', { 
          userId: session.user.id, 
          token: token.substring(0, 10) + '...',
          email: session.user.email 
        });

        // Get Telegram user ID from token
        const response = await fetch('/api/telegram/link-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            userId: session.user.id,
          }),
        });

        const data = await response.json();
        console.log('📨 Link account response:', data);
        
        if (!data.success) {
          console.error('❌ Link account failed:', data.error);
        }

        if (data.success) {
          setLinkingComplete(true);
          setStatus('success');
          setMessage('✅ Successfully linked your Telegram account! You can now return to Telegram and start using the bot.');
          
          // Redirect to Telegram after 3 seconds
          setTimeout(() => {
            window.close();
            // If window doesn't close, redirect to dashboard
            router.push(`/${session.user.name}/dashboard`);
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to link Telegram account. Please try again.');
        }
      } catch (error) {
        console.error('Error linking Telegram account:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Linking Telegram Account...
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Please wait while we link your Telegram account.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Success!
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Error
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {message}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TelegramOAuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <TelegramOAuthCallbackContent />
    </Suspense>
  );
}

