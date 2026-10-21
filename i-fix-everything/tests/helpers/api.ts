import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { emptyIdentity, userField } from '@ife/domain';
import { handleApiRequest, withSystem } from '@ife/server';

export interface TestUser {
  id: string;
  email: string;
  token: string;
  signOut: () => Promise<void>;
}

const admin = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Provision a confirmed user through the Auth admin API, then sign in for a real JWT. */
export async function createUser(label = 'user'): Promise<TestUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { ife_admin_created: true },
  });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error('signIn failed');
  return {
    id: data.user.id,
    email,
    token: signIn.data.session.access_token,
    signOut: async () => {
      await client.auth.signOut({ scope: 'global' });
    },
  };
}

export async function api<T = any>(
  user: TestUser | null,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: T }> {
  const res = await handleApiRequest(
    new Request(`http://localhost:3000/api/v1${path}`, {
      method,
      headers: {
        ...(user ? { authorization: `Bearer ${user.token}` } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, body: (await res.json()) as T };
}

export function machineInput(overrides: Record<string, unknown> = {}) {
  const identity = emptyIdentity();
  identity.make = userField('Predator');
  identity.powerType = userField('gasoline_4_stroke');
  return {
    idempotencyKey: randomUUID(),
    category: 'go_kart',
    nickname: 'Backyard kart',
    identity,
    installedComponents: [],
    modifications: [],
    ...overrides,
  };
}

export async function grantPro(userId: string): Promise<void> {
  await withSystem(
    (tx) => tx`
      insert into app.entitlements (user_id, tier, plan_version_id, source, valid_from, valid_until, period_start, period_end)
      values (${userId}, 'pro', 'pro-2026-10-v1', 'admin_grant', now() - interval '1 minute', now() + interval '30 days',
              now() - interval '1 minute', now() + interval '30 days')`,
  );
}

export async function uploadTo(url: string, body: Uint8Array, contentType: string): Promise<number> {
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': contentType, 'x-upsert': 'true' }, body });
  return res.status;
}
