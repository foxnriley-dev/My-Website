import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';
import { AppError } from './errors';

let admin: SupabaseClient | null = null;

/** Service-role client. Server only — never construct this in a client bundle. */
export function adminClient(): SupabaseClient {
  if (!admin) {
    const env = getEnv();
    admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return admin;
}

function bucket() {
  return adminClient().storage.from(getEnv().MEDIA_BUCKET);
}

function unavailable(op: string, cause: unknown): AppError {
  console.error(JSON.stringify({ level: 'error', msg: 'storage_failure', op, cause: String(cause) }));
  return new AppError('service_unavailable', 'Photo storage is temporarily unavailable. Try again shortly.');
}

/** Server-generated object keys: owner / case / evidence. Never derived from user input. */
export const objectKeys = {
  original: (userId: string, caseId: string, evidenceId: string) => `${userId}/${caseId}/${evidenceId}/original`,
  derivative: (userId: string, caseId: string, evidenceId: string, kind: string, ext: string) =>
    `${userId}/${caseId}/${evidenceId}/${kind}.${ext}`,
  casePrefix: (userId: string, caseId: string) => `${userId}/${caseId}`,
  userPrefix: (userId: string) => `${userId}`,
};

export async function createUploadUrl(key: string): Promise<{ url: string; token: string }> {
  const { data, error } = await bucket().createSignedUploadUrl(key, { upsert: true });
  if (error || !data) throw unavailable('createSignedUploadUrl', error);
  return { url: data.signedUrl, token: data.token };
}

export async function objectInfo(key: string): Promise<{ size: number | null } | null> {
  const { data, error } = await bucket().info(key);
  if (error) {
    const status = (error as { status?: number; statusCode?: string | number }).status ?? (error as { statusCode?: string }).statusCode;
    if (String(status) === '404' || String(status) === '400' || /not found/i.test(error.message)) return null;
    throw unavailable('info', error);
  }
  return { size: data?.size ?? null };
}

export async function download(key: string): Promise<Buffer> {
  const { data, error } = await bucket().download(key);
  if (error || !data) throw unavailable('download', error);
  return Buffer.from(await data.arrayBuffer());
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { error } = await bucket().upload(key, body, { contentType, upsert: true, cacheControl: 'private, max-age=0' });
  if (error) throw unavailable('upload', error);
}

export async function removeObjects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  let removed = 0;
  for (let i = 0; i < keys.length; i += 100) {
    const { data, error } = await bucket().remove(keys.slice(i, i + 100));
    if (error) throw unavailable('remove', error);
    removed += data?.length ?? 0;
  }
  return removed;
}

/** Recursively list every object key under a prefix (used for case/account deletion). */
export async function listKeys(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (path: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket().list(path, { limit: 1000, offset });
      if (error) throw unavailable('list', error);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const full = `${path}/${entry.name}`;
        if (entry.id === null) await walk(full);
        else out.push(full);
      }
      if (data.length < 1000) break;
    }
  };
  await walk(prefix);
  return out;
}

export async function signedUrls(keys: string[], seconds: number): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (keys.length === 0) return map;
  const { data, error } = await bucket().createSignedUrls(keys, seconds);
  if (error || !data) throw unavailable('createSignedUrls', error);
  for (const item of data) if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  return map;
}
