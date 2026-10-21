#!/usr/bin/env node
// Creates a beta invite code (prints it once; only its hash is stored).
// Usage: node scripts/create-invite.mjs [maxUses=1] [validDays=30] [note]
import { resolve } from 'node:path';
import postgres from 'postgres';

process.loadEnvFile(resolve(import.meta.dirname, '../.env.local'));
const [maxUses = '1', days = '30', note = null] = process.argv.slice(2);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ code }] = await sql`select app.create_beta_invite(${Number(maxUses)}, ${Number(days)}, ${note}) as code`;
console.log(code);
await sql.end();
