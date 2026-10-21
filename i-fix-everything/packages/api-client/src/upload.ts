import { MEDIA_LIMITS, type EvidenceItem, type EvidenceRole, type Job } from '@ife/contracts';
import type { ApiClient } from './index';

/**
 * Upload orchestration shared by web, iOS and Android.
 *
 * Each file has its own manifest entry with a stable idempotency key, so a
 * failed file retries independently and a retry after an app restart resumes
 * the same server-side evidence item instead of creating a duplicate. The
 * server is asked first, so a file that already arrived is never re-sent.
 */
export type UploadState = 'queued' | 'uploading' | 'completing' | 'done' | 'failed' | 'needs_reselect';

export interface UploadManifestEntry {
  localId: string;
  idempotencyKey: string;
  caseId: string;
  role: EvidenceRole;
  mime: string;
  bytes: number;
  /** Native: file URI in the app sandbox. Web: absent (File objects cannot be persisted). */
  localUri?: string;
  evidenceId?: string;
  state: UploadState;
  error?: string;
  updatedAt: string;
}

export interface UploadSource {
  mime: string;
  bytes: number;
  read: () => Promise<Blob | Uint8Array | ArrayBuffer>;
  /** Optional platform upload (e.g. native streaming from a file URI) used instead of fetch. */
  put?: (url: string, headers: Record<string, string>, contentType: string) => Promise<void>;
}

export function normalizeMime(mime: string | null | undefined, fileName?: string | null): string {
  const m = (mime ?? '').toLowerCase();
  if (m === 'image/jpg') return 'image/jpeg';
  if (m) return m;
  const ext = fileName?.split('.').pop()?.toLowerCase();
  return (
    { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' }[ext ?? ''] ??
    'application/octet-stream'
  );
}

/** Early, friendly feedback only — the server re-validates the actual bytes. */
export function prevalidate(mime: string, bytes: number): string | null {
  if (!(MEDIA_LIMITS.acceptedMimeTypes as readonly string[]).includes(mime)) return 'Use a JPEG, PNG, WebP or HEIC photo.';
  if (bytes <= 0) return 'This file is empty.';
  if (bytes > MEDIA_LIMITS.maxBytes) return 'This photo is larger than 15 MB.';
  return null;
}

export async function runUpload(
  client: ApiClient,
  entry: UploadManifestEntry,
  source: UploadSource | null,
  onChange: (next: UploadManifestEntry) => void,
): Promise<{ evidence: EvidenceItem; job: Job | null } | null> {
  const set = (patch: Partial<UploadManifestEntry>) => {
    entry = { ...entry, ...patch, updatedAt: new Date().toISOString() };
    onChange(entry);
  };
  try {
    set({ state: 'uploading', error: undefined });
    const session = await client.evidence.requestUpload(entry.caseId, {
      idempotencyKey: entry.idempotencyKey,
      role: entry.role,
      declaredMime: entry.mime,
      declaredBytes: entry.bytes,
    });
    set({ evidenceId: session.evidence.id });
    if (session.upload) {
      if (!source) {
        // The app was restarted and the local file is gone: ask the user to pick it again.
        set({ state: 'needs_reselect', error: 'Select this photo again to finish uploading it.' });
        return null;
      }
      if (source.put) await source.put(session.upload.url, session.upload.headers, entry.mime);
      else await client.putToSignedUrl(session.upload.url, session.upload.headers, await source.read(), entry.mime);
    }
    set({ state: 'completing' });
    const result = await client.evidence.complete(session.evidence.id);
    set({ state: 'done' });
    return result;
  } catch (err) {
    set({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed. Try again.' });
    return null;
  }
}
