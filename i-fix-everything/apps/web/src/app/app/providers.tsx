'use client';

import { createApiClient } from '@ife/api-client';
import { ApiProvider, createQueryClient, useMe } from '@ife/api-client/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { publicEnv } from '@/lib/env';
import { applyTheme, clearAllLocal } from '@/lib/local-store';
import { supabaseBrowser } from '@/lib/supabase/browser';

interface Session {
  userId: string | null;
  signOut: () => Promise<void>;
}
const SessionContext = createContext<Session>({ userId: null, signOut: async () => {} });
export const useSession = () => useContext(SessionContext);

function ThemeSync() {
  const me = useMe();
  useEffect(() => {
    if (me.data) applyTheme(me.data.preferences.theme);
  }, [me.data]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(() => createQueryClient());
  const [userId, setUserId] = useState<string | null>(null);

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: typeof window === 'undefined' ? '' : window.location.origin,
        platform: 'web',
        appVersion: publicEnv.appVersion,
        getAccessToken: async () => (await supabaseBrowser().auth.getSession()).data.session?.access_token ?? null,
        onUnauthenticated: () => {
          const here = window.location.pathname + window.location.search;
          router.replace(`/sign-in?next=${encodeURIComponent(here)}`);
        },
      }),
    [router],
  );

  useEffect(() => {
    const sb = supabaseBrowser();
    void sb.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null);
      if (event === 'SIGNED_OUT') {
        // Clean account switching: drop cached private data and local drafts.
        queryClient.clear();
        clearAllLocal();
        router.replace('/sign-in');
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  const session = useMemo<Session>(
    () => ({
      userId,
      signOut: async () => {
        await supabaseBrowser().auth.signOut();
        queryClient.clear();
        clearAllLocal();
        router.replace('/sign-in');
        router.refresh();
      },
    }),
    [userId, queryClient, router],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={api}>
        <SessionContext.Provider value={session}>
          <ThemeSync />
          {children}
        </SessionContext.Provider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
