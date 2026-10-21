import { describe, expect, it } from 'vitest';
import { assertDeployableConfig, getEnv, type ServerEnv } from '../src/env';

const base = {
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  SUPABASE_SECRET_KEY: 'sb_secret_real',
  DATABASE_URL: 'postgres://x',
  PUBLIC_SITE_URL: 'https://app.example.com',
};

describe('deployment configuration guard', () => {
  it('refuses demo/fixture mode outside development', () => {
    expect(() => getEnv({ ...base, APP_ENV: 'staging', DEMO_MODE: 'true' })).toThrow(/DEMO_MODE/);
    expect(getEnv({ ...base, APP_ENV: 'development', DEMO_MODE: 'true' }).DEMO_MODE).toBe(true);
  });

  it('refuses local services and the public local secret key in production', () => {
    const env = getEnv({ ...base, APP_ENV: 'production' }) as ServerEnv;
    expect(() => assertDeployableConfig({ ...env, SUPABASE_URL: 'http://127.0.0.1:54321' })).toThrow(/local service/);
    expect(() => assertDeployableConfig({ ...env, SUPABASE_SECRET_KEY: 'sb_secret_N7UND0UgjKTVK' + '-placeholder-suffix' })).toThrow(/public local-development/);
  });

  it('reports missing configuration by name without leaking values', () => {
    expect(() => getEnv({ APP_ENV: 'production' })).toThrow(/SUPABASE_URL.*\.env\.example/);
  });
});
