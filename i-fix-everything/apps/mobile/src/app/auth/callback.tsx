import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Loading, Notice, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Only these in-app destinations may follow an auth callback. */
const ALLOWED_NEXT = new Set(['reset-password']);

/**
 * Handles ifixeverything[-dev]://auth/callback?code=… from confirmation and
 * recovery emails (PKCE). The code verifier lives in this device's secure
 * store, so the link must be opened on the device that requested it.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; next?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(params.error_description ?? null);

  useEffect(() => {
    if (!params.code) {
      if (!params.error_description) setError('This sign-in link is incomplete.');
      return;
    }
    void supabase()
      .auth.exchangeCodeForSession(params.code)
      .then(({ error: err }) => {
        if (err) return setError('This link has expired, was already used, or was opened on a different device.');
        router.replace(params.next && ALLOWED_NEXT.has(params.next) ? `/${params.next}` : '/');
      });
  }, [params.code, params.next, params.error_description]);

  return (
    <Screen edges={['top', 'bottom']}>
      {error ? (
        <Notice tone="danger" title="Could not sign you in" action={<Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />}>
          {error}
        </Notice>
      ) : (
        <Loading label="Signing you in" />
      )}
    </Screen>
  );
}
