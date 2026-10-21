'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '../env';

let client: SupabaseClient | null = null;

/** Browser session lives in cookies so the proxy can refresh it server-side. */
export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
      auth: { flowType: 'pkce' },
    });
  }
  return client;
}
