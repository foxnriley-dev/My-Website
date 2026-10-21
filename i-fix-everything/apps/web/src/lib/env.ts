/** Browser-safe configuration (inlined at build time). Never put secrets here. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  appVersion: '0.1.0',
};

export function publicConfigMissing(): string[] {
  const missing: string[] = [];
  if (!publicEnv.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!publicEnv.supabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  return missing;
}
