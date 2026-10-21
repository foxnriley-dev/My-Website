#!/usr/bin/env node
// Creates a confirmed LOCAL test user (development only) and prints credentials.
// Usage: node scripts/create-test-user.mjs [label]
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile(resolve(import.meta.dirname, '../.env.local'));
if (process.env.APP_ENV !== 'development' || !/127\.0\.0\.1|localhost/.test(process.env.SUPABASE_URL ?? '')) {
  console.error('Refusing: this script only runs against a local development stack.');
  process.exit(1);
}
const email = `${process.argv[2] ?? 'tester'}-${randomUUID().slice(0, 6)}@example.test`;
const password = `pw-${randomUUID()}`;
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { ife_admin_created: true } });
if (error) throw error;
console.log(JSON.stringify({ email, password }, null, 2));
