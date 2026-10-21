#!/usr/bin/env node
// Writes .env.local from the running local Supabase stack (`supabase status`).
// Local Supabase keys are the CLI's public development defaults, not secrets,
// but .env.local is still git-ignored.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bin = resolve(root, 'node_modules/.bin/supabase');
const out = execFileSync(existsSync(bin) ? bin : 'supabase', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8' });
const s = JSON.parse(out.slice(out.indexOf('{')));
const lanApi = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

const values = {
  APP_ENV: 'development',
  SUPABASE_URL: s.API_URL,
  SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
  SUPABASE_SECRET_KEY: s.SECRET_KEY ?? s.SERVICE_ROLE_KEY,
  DATABASE_URL: s.DB_URL,
  MEDIA_BUCKET: 'case-media',
  PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: s.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
  EXPO_PUBLIC_API_BASE_URL: lanApi,
  EXPO_PUBLIC_SUPABASE_URL: s.API_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
  MAILPIT_URL: s.MAILPIT_URL ?? s.INBUCKET_URL,
  DEMO_MODE: 'false',
};
const toEnv = (obj) => Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
const target = resolve(root, '.env.local');
writeFileSync(target, toEnv(values));
// Next.js reads env from its app directory; the web app hosts the API, so it gets server values.
writeFileSync(resolve(root, 'apps/web/.env.local'), toEnv(values));
// The native app gets ONLY public EXPO_PUBLIC_* values — never server secrets.
const mobile = Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith('EXPO_PUBLIC_')));
writeFileSync(resolve(root, 'apps/mobile/.env.local'), toEnv(mobile));
console.log(`Wrote ${target}, apps/web/.env.local and apps/mobile/.env.local (public values only) from local Supabase.`);
if (existsSync(resolve(root, '.env')) && readFileSync(resolve(root, '.env'), 'utf8').trim()) {
  console.log('Note: a .env file also exists; .env.local takes precedence in Next.js and Expo.');
}
