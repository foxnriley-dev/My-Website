import type { RejectionReason } from '@ife/contracts';
import { withSystem } from '../db';
import { touchCaseForEvidence } from './cases';

/**
 * System-side state transitions for media processing. Every statement is
 * scoped by the ids carried in the job payload, which were written by the API
 * after an RLS-checked ownership test.
 */
export interface ClaimedMedia {
  evidenceId: string;
  caseId: string;
  userId: string;
  originalObjectKey: string;
}

export async function claimMediaJob(jobId: string, evidenceId: string, userId: string): Promise<ClaimedMedia | null> {
  return withSystem(async (tx) => {
    const [ev] = await tx<{ id: string; caseId: string; userId: string; status: string; originalObjectKey: string }[]>`
      select id, case_id, user_id, status, original_object_key from app.evidence_items
      where id = ${evidenceId} and user_id = ${userId} for update`;
    const [job] = await tx<{ status: string }[]>`select status from app.jobs where id = ${jobId} and user_id = ${userId} for update`;
    if (!ev || !job || ['cancelled', 'succeeded'].includes(job.status)) {
      // Evidence was removed, the case deleted, or the job already finished: nothing to do.
      if (job && job.status !== 'succeeded') {
        await tx`update app.jobs set status = 'cancelled', completed_at = now() where id = ${jobId} and status in ('queued', 'running')`;
      }
      return null;
    }
    if (!['uploaded', 'processing'].includes(ev.status)) return null;
    await tx`update app.evidence_items set status = 'processing' where id = ${evidenceId}`;
    await tx`
      update app.jobs set status = 'running', attempts = attempts + 1, message = 'Checking your photo'
      where id = ${jobId}`;
    return { evidenceId: ev.id, caseId: ev.caseId, userId: ev.userId, originalObjectKey: ev.originalObjectKey };
  });
}

export interface DerivativeRecord {
  kind: 'preview' | 'thumb' | 'analysis';
  objectKey: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
}

export async function markMediaReady(
  jobId: string,
  claim: ClaimedMedia,
  info: { detectedMime: string; bytes: number; width: number; height: number; sha256: string },
  derivatives: DerivativeRecord[],
): Promise<boolean> {
  return withSystem(async (tx) => {
    const [ev] = await tx<{ id: string }[]>`select id from app.evidence_items where id = ${claim.evidenceId} for update`;
    if (!ev) return false; // removed while processing; caller deletes the orphaned objects
    for (const d of derivatives) {
      await tx`
        insert into app.media_derivatives (evidence_id, user_id, kind, object_key, mime, width, height, bytes, location_metadata_removed)
        values (${claim.evidenceId}, ${claim.userId}, ${d.kind}, ${d.objectKey}, ${d.mime}, ${d.width}, ${d.height}, ${d.bytes}, true)
        on conflict (evidence_id, kind) do update set
          object_key = excluded.object_key, mime = excluded.mime, width = excluded.width,
          height = excluded.height, bytes = excluded.bytes`;
    }
    await tx`
      update app.evidence_items set status = 'ready', rejection_reason = null, detected_mime = ${info.detectedMime},
        bytes = ${info.bytes}, width = ${info.width}, height = ${info.height}, sha256 = ${info.sha256}, processed_at = now()
      where id = ${claim.evidenceId}`;
    await tx`
      update app.jobs set status = 'succeeded', message = 'Photo ready', error_code = null, retryable = false, completed_at = now()
      where id = ${jobId}`;
    await touchCaseForEvidence(tx, claim.caseId, true);
    return true;
  });
}

export async function markMediaRejected(jobId: string, claim: ClaimedMedia, reason: RejectionReason): Promise<void> {
  await withSystem(async (tx) => {
    await tx`
      update app.evidence_items set status = 'rejected', rejection_reason = ${reason}, processed_at = now()
      where id = ${claim.evidenceId}`;
    await tx`
      update app.jobs set status = 'failed', message = 'Photo could not be used', error_code = ${reason},
        retryable = false, completed_at = now()
      where id = ${jobId}`;
    await touchCaseForEvidence(tx, claim.caseId, false);
  });
}

/** Transient failure: record the attempt. When retries are exhausted the item becomes retryable by the user. */
export async function markMediaAttemptFailed(jobId: string, claim: ClaimedMedia, final: boolean): Promise<void> {
  await withSystem(async (tx) => {
    if (final) {
      await tx`update app.evidence_items set status = 'failed', processed_at = now() where id = ${claim.evidenceId}`;
      await tx`
        update app.jobs set status = 'failed', message = 'We could not process this photo. Try uploading it again.',
          error_code = 'processing_unavailable', retryable = true, completed_at = now()
        where id = ${jobId}`;
      await touchCaseForEvidence(tx, claim.caseId, false);
    } else {
      await tx`update app.evidence_items set status = 'uploaded' where id = ${claim.evidenceId}`;
      await tx`update app.jobs set status = 'queued', message = 'Retrying shortly' where id = ${jobId}`;
    }
  });
}
