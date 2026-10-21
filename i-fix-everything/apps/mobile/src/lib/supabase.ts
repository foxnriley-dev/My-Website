import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { appConfig } from './config';
import { secureKV } from './secure-kv';

let client: SupabaseClient | null = null;

/**
 * Native auth adapter: same identity service as the web, refresh credentials
 * kept in the protected credential store, PKCE for email links.
 */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(appConfig.supabaseUrl || 'http://unconfigured.invalid', appConfig.supabaseKey || 'unconfigured', {
      auth: {
        storage: secureKV,
        storageKey: 'ife.auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
    // Refresh tokens only while the app is in the foreground.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
