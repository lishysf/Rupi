'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Redirect to the user's dashboard
    if (session.user?.name) {
      const completed = (session.user as any).onboardingCompleted === true;
      if (!completed) {
        router.push('/onboarding');
      } else {
        router.push(`/${session.user.name}/dashboard`);
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            Fundy
          </div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return null; // Will redirect
}
