import { runUpload, type ApiClient, type UploadManifestEntry, type UploadSource } from '@ife/api-client';
import { UploadType } from 'expo-file-system';
import { localFile } from './photos';
import { readJson, writeJson } from './secure-kv';

/**
 * Persisted upload manifest (one per signed-in user). It records an
 * idempotency key per photo so a retry after the app was suspended or killed
 * resumes the same server item rather than creating a duplicate.
 */
const key = (userId: string) => `uploads.${userId}`;

export async function loadManifest(userId: string): Promise<UploadManifestEntry[]> {
  return (await readJson<UploadManifestEntry[]>(key(userId))) ?? [];
}

let writeChain: Promise<void> = Promise.resolve();
export function saveEntry(userId: string, entry: UploadManifestEntry): Promise<void> {
  writeChain = writeChain.then(async () => {
    const list = await loadManifest(userId);
    const next = [...list.filter((e) => e.localId !== entry.localId), entry].slice(-40);
    await writeJson(key(userId), next);
  });
  return writeChain;
}

export function removeEntry(userId: string, localId: string): Promise<void> {
  writeChain = writeChain.then(async () => {
    const list = await loadManifest(userId);
    await writeJson(key(userId), list.filter((e) => e.localId !== localId));
    localFile(list.find((e) => e.localId === localId)?.localUri)?.delete();
  });
  return writeChain;
}

export function sourceFor(entry: UploadManifestEntry): UploadSource | null {
  const file = localFile(entry.localUri);
  if (!file) return null;
  return {
    mime: entry.mime,
    bytes: entry.bytes,
    read: () => file.bytes(),
    // Native streaming upload from the file URI (no full read into JS memory).
    put: async (url, headers, contentType) => {
      const res = await file.upload(url, { httpMethod: 'PUT', uploadType: UploadType.BINARY_CONTENT, headers: { ...headers, 'content-type': contentType }, mimeType: contentType });
      if (res.status < 200 || res.status >= 300) throw new Error('The upload did not finish. Try again.');
    },
  };
}

export async function upload(api: ApiClient, userId: string, entry: UploadManifestEntry, onChange: (e: UploadManifestEntry) => void) {
  await saveEntry(userId, entry);
  const result = await runUpload(api, entry, sourceFor(entry), (next) => {
    onChange(next);
    void saveEntry(userId, next);
  });
  if (result) await removeEntry(userId, entry.localId);
  return result;
}

/**
 * On launch and on returning to the foreground: finish anything unfinished.
 * The server is asked first, so completed uploads are never sent twice.
 */
export async function resumePending(api: ApiClient, userId: string, onChange: (e: UploadManifestEntry) => void): Promise<number> {
  const pending = (await loadManifest(userId)).filter((e) => e.state !== 'done' && e.state !== 'needs_reselect');
  for (const e of pending) await upload(api, userId, e, onChange);
  return pending.length;
}
