import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deleteLocalCopies } from './photos';
import { secureKV } from './secure-kv';
import { supabase } from './supabase';

type Status = 'loading' | 'signedOut' | 'signedIn';
interface SessionValue {
  status: Status;
  userId: string | null;
  email: string | null;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({ status: 'loading', userId: null, email: null, signOut: async () => {} });
export const useSession = () => useContext(SessionContext);

/** Clears private data cached on this device. Runs on sign-out and account switching. */
export async function clearLocalPrivateData() {
  await secureKV.clear('drafts.');
  await secureKV.clear('uploads.');
  deleteLocalCopies();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<{ status: Status; userId: string | null; email: string | null }>({ status: 'loading', userId: null, email: null });

  useEffect(() => {
    let mounted = true;
    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const u = data.session?.user;
        setState(u ? { status: 'signedIn', userId: u.id, email: u.email ?? null } : { status: 'signedOut', userId: null, email: null });
      });
    const { data } = supabase().auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      setState((prev) => {
        if (prev.userId && u && prev.userId !== u.id) {
          // Different account on this device: never show the previous user's cache.
          qc.clear();
          void clearLocalPrivateData();
        }
        return u ? { status: 'signedIn', userId: u.id, email: u.email ?? null } : { status: 'signedOut', userId: null, email: null };
      });
      if (event === 'SIGNED_OUT') qc.clear();
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [qc]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut().catch(() => supabase().auth.signOut({ scope: 'local' }));
    qc.clear();
    await clearLocalPrivateData();
  }, [qc]);

  const value = useMemo(() => ({ ...state, signOut }), [state, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
