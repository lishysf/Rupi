'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false} refetchInterval={0}>
      {children}
    </NextAuthSessionProvider>
  );
}
