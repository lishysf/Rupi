'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import Dashboard from '@/app/components/Dashboard';

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if the username in the URL matches the current user
    // You can customize this logic based on how you want to handle usernames
    // For now, we'll redirect to the user's own dashboard if they try to access someone else's
    if (session.user?.name && session.user.name !== username) {
      router.push(`/${session.user.name}/dashboard`);
      return;
    }
  }, [session, status, router, username]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            Fundy
          </div>
          <div className="text-slate-600 dark:text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return <Dashboard />;
}
