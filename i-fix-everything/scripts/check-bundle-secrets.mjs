#!/usr/bin/env node
// Fails if any server-only secret VALUE from .env.local appears in a client bundle
// (web static chunks or native Hermes bundles). Prefix checks in libraries are fine;
// real values are not.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envFile = resolve(root, '.env.local');
if (!existsSync(envFile)) {
  console.error('No .env.local; nothing to compare against.');
  process.exit(2);
}
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const secrets = ['SUPABASE_SECRET_KEY', 'DATABASE_URL', 'ANTHROPIC_API_KEY', 'YOUTUBE_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
  .map((k) => [k, env[k]])
  .filter(([, v]) => v && v.length > 8);

const dirs = ['apps/web/.next/static', 'apps/mobile/dist'].map((d) => resolve(root, d)).filter(existsSync);
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : files.push(join(d, f))));
dirs.forEach(walk);

let leaks = 0;
for (const f of files) {
  const body = readFileSync(f).toString('latin1');
  for (const [name, value] of secrets) {
    if (body.includes(value)) {
      console.error(`LEAK: ${name} value found in ${f}`);
      leaks++;
    }
  }
  if (/@ife\/server|pg-boss/.test(body)) {
    console.error(`SERVER CODE: server-only module referenced in ${f}`);
    leaks++;
  }
}
console.log(`Scanned ${files.length} client files in ${dirs.length} build dirs for ${secrets.length} secret values: ${leaks ? `${leaks} problem(s)` : 'clean'}.`);
process.exit(leaks ? 1 : 0);
