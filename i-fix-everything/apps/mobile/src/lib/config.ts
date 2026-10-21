import Constants from 'expo-constants';

/** Public (non-secret) configuration inlined at build time. */
export const appConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  appVersion: Constants.expoConfig?.version ?? '0.1.0',
  scheme: (Constants.expoConfig?.scheme as string | undefined) ?? 'ifixeverything-dev',
};

export function missingConfig(): string[] {
  return (
    [
      ['EXPO_PUBLIC_API_BASE_URL', appConfig.apiBaseUrl],
      ['EXPO_PUBLIC_SUPABASE_URL', appConfig.supabaseUrl],
      ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', appConfig.supabaseKey],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

/** Exact auth callback for this build variant (must be in the Auth allow-list). */
export const authCallbackUrl = () => `${appConfig.scheme}://auth/callback`;
