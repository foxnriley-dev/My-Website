import {
  MEDIA_LIMITS,
  type EvidenceItem,
  type EvidenceRole,
  type EvidenceStatus,
  type EvidenceUpdateInput,
  type Job,
  type RejectionReason,
  type UploadRequestInput,
  type UploadSession,
} from '@ife/contracts';
import { iso, isoReq, type Tx, type UserContext, one } from '../db';
import { AppError, notFound } from '../errors';
import { createUploadUrl, objectInfo, objectKeys, removeObjects, signedUrls } from '../storage';
import { audit } from './audit';
import { touchCaseForEvidence } from './cases';
import { enqueueMediaJob, getJob } from './jobs';

interface EvidenceRow {
  id: string;
  caseId: string;
  userId: string;
  role: EvidenceRole;
  sortOrder: number;
  status: EvidenceStatus;
  rejectionReason: RejectionReason | null;
  caption: string | null;
  bytes: number | null;
  detectedMime: string | null;
  width: number | null;
  height: number | null;
  originalObjectKey: string;
  declaredBytes: number | null;
  createdAt: Date;
  processedAt: Date | null;
}

const EVIDENCE_COLS = (tx: Tx) => tx`
  id, case_id, user_id, role, sort_order, status, rejection_reason, caption, bytes::int as bytes, detected_mime,
  width, height, original_object_key, declared_bytes::int as declared_bytes, created_at, processed_at`;

/** Signed preview URLs are created only after RLS has proven ownership of the rows. */
async function toItems(tx: Tx, rows: EvidenceRow[]): Promise<EvidenceItem[]> {
  const ready = rows.filter((r) => r.status === 'ready').map((r) => r.id);
  const derivs = ready.length
    ? await tx<{ evidenceId: string; kind: string; objectKey: string; width: number; height: number }[]>`
        select evidence_id, kind, object_key, width, height from app.media_derivatives
        where evidence_id = any(${ready}::uuid[]) and kind in ('preview', 'thumb')`
    : [];
  const urls = await signedUrls(derivs.map((d) => d.objectKey), MEDIA_LIMITS.signedUrlSeconds);
  const expires = new Date(Date.now() + MEDIA_LIMITS.signedUrlSeconds * 1000).toISOString();
  return rows.map((r) => {
    const img = (kind: string) => {
      const d = derivs.find((x) => x.evidenceId === r.id && x.kind === kind);
      const url = d && urls.get(d.objectKey);
      return d && url ? { url, width: d.width, height: d.height } : null;
    };
    const preview = img('preview');
    return {
      id: r.id,
      caseId: r.caseId,
      role: r.role,
      sortOrder: r.sortOrder,
      status: r.status,
      rejectionReason: r.rejectionReason,
      caption: r.caption,
      bytes: r.bytes,
      detectedMime: r.detectedMime,
      width: r.width,
      height: r.height,
      createdAt: isoReq(r.createdAt),
      processedAt: iso(r.processedAt),
      preview,
      thumb: img('thumb'),
      urlsExpireAt: preview ? expires : null,
    };
  });
}

async function loadEvidence(tx: Tx, id: string, lock = false): Promise<EvidenceRow> {
  const [row] = lock
    ? await tx<EvidenceRow[]>`select ${EVIDENCE_COLS(tx)} from app.evidence_items where id = ${id} for update`
    : await tx<EvidenceRow[]>`select ${EVIDENCE_COLS(tx)} from app.evidence_items where id = ${id}`;
  if (!row) throw notFound('That photo');
  return row;
}

export async function getEvidence(tx: Tx, id: string): Promise<EvidenceItem> {
  const [item] = await toItems(tx, [await loadEvidence(tx, id)]);
  return item!;
}

export async function listEvidence(tx: Tx, caseId: string): Promise<EvidenceItem[]> {
  const [c] = await tx`select 1 from app.repair_cases where id = ${caseId}`;
  if (!c) throw notFound('That case');
  const rows = await tx<EvidenceRow[]>`
    select ${EVIDENCE_COLS(tx)} from app.evidence_items where case_id = ${caseId} order by sort_order, created_at`;
  return toItems(tx, rows);
}

/** Rough abuse control: bounded upload sessions per user per 10 minutes. */
const MAX_UPLOAD_REQUESTS_PER_10_MIN = 60;

export async function requestUpload(
  tx: Tx,
  user: UserContext,
  caseId: string,
  input: UploadRequestInput,
  requestId: string,
): Promise<UploadSession> {
  const [kase] = await tx<{ id: string; archivedAt: Date | null }[]>`
    select id, archived_at from app.repair_cases where id = ${caseId} for update`;
  if (!kase) throw notFound('That case');
  if (kase.archivedAt) throw new AppError('validation_failed', 'Restore this case before adding photos.');

  // Idempotent retry: same key returns the same evidence item, with a fresh URL if still pending.
  const [existing] = await tx<EvidenceRow[]>`
    select ${EVIDENCE_COLS(tx)} from app.evidence_items where user_id = ${user.id} and idempotency_key = ${input.idempotencyKey}`;
  if (existing) {
    if (existing.caseId !== caseId) throw new AppError('conflict', 'This upload belongs to a different case.');
    const [item] = await toItems(tx, [existing]);
    if (existing.status !== 'pending_upload') return { evidence: item!, upload: null };
    await tx`update app.evidence_items set upload_attempts = upload_attempts + 1 where id = ${existing.id}`;
    return { evidence: item!, upload: await uploadTarget(existing.originalObjectKey) };
  }

  if (!(MEDIA_LIMITS.acceptedMimeTypes as readonly string[]).includes(input.declaredMime.toLowerCase())) {
    throw new AppError('unsupported_media', 'Use a JPEG, PNG, WebP or HEIC photo.');
  }
  if (input.declaredBytes > MEDIA_LIMITS.maxBytes) {
    throw new AppError('payload_too_large', 'Photos must be 15 MB or smaller.');
  }
  const { count } = await one(tx<{ count: number }[]>`
    select count(*)::int as count from app.evidence_items where case_id = ${caseId} and status not in ('rejected', 'failed')`);
  if (count >= MEDIA_LIMITS.maxImagesPerCase) {
    throw new AppError('limit_reached', `A case can hold up to ${MEDIA_LIMITS.maxImagesPerCase} photos. Remove one to add another.`);
  }
  const { recent } = await one(tx<{ recent: number }[]>`
    select count(*)::int as recent from app.evidence_items
    where user_id = ${user.id} and created_at > now() - interval '10 minutes'`);
  if (recent >= MAX_UPLOAD_REQUESTS_PER_10_MIN) {
    throw new AppError('rate_limited', 'Too many uploads in a short time. Wait a few minutes and try again.');
  }

  const { id } = await one(tx<{ id: string }[]>`select gen_random_uuid() as id`);
  const key = objectKeys.original(user.id, caseId, id);
  const { next } = await one(tx<{ next: number }[]>`
    select coalesce(max(sort_order), -1) + 1 as next from app.evidence_items where case_id = ${caseId}`);
  await tx`
    insert into app.evidence_items (id, case_id, user_id, role, sort_order, declared_mime, declared_bytes,
                                    original_object_key, client_platform, idempotency_key, upload_attempts)
    values (${id}, ${caseId}, ${user.id}, ${input.role}, ${next}, ${input.declaredMime.toLowerCase()}, ${input.declaredBytes},
            ${key}, ${input.clientPlatform}, ${input.idempotencyKey}, 1)`;
  await touchCaseForEvidence(tx, caseId, false);
  await audit(tx, { userId: user.id, actor: 'user', action: 'evidence.upload.request', entityType: 'evidence', entityId: id, requestId });
  return { evidence: await getEvidence(tx, id), upload: await uploadTarget(key) };
}

async function uploadTarget(key: string): Promise<NonNullable<UploadSession['upload']>> {
  const { url } = await createUploadUrl(key);
  return {
    url,
    method: 'PUT',
    headers: { 'x-upsert': 'true' },
    expiresAt: new Date(Date.now() + MEDIA_LIMITS.uploadUrlSeconds * 1000).toISOString(),
  };
}

/**
 * Called after the client finishes the direct upload. Verifies the object
 * actually exists before queuing validation. Repeat calls return the same job.
 */
export async function completeUpload(
  tx: Tx,
  user: UserContext,
  id: string,
  requestId: string,
): Promise<{ evidence: EvidenceItem; job: Job | null }> {
  const row = await loadEvidence(tx, id, true);
  if (row.status !== 'pending_upload') {
    const [job] = await tx<{ id: string }[]>`
      select id from app.jobs where subject_id = ${id} and kind = 'media_process' order by created_at desc limit 1`;
    return { evidence: await getEvidence(tx, id), job: job ? await getJob(tx, job.id) : null };
  }
  const info = await objectInfo(row.originalObjectKey);
  if (!info) {
    throw new AppError('validation_failed', 'The photo has not finished uploading. Try the upload again.', { retryable: true });
  }
  if (info.size !== null && info.size > MEDIA_LIMITS.maxBytes) {
    await removeObjects([row.originalObjectKey]);
    await tx`update app.evidence_items set status = 'rejected', rejection_reason = 'too_large', processed_at = now() where id = ${id}`;
    await touchCaseForEvidence(tx, row.caseId, false);
    return { evidence: await getEvidence(tx, id), job: null };
  }
  await tx`update app.evidence_items set status = 'uploaded', uploaded_at = now(), bytes = ${info.size} where id = ${id}`;
  const job = await enqueueMediaJob(tx, user, { caseId: row.caseId, evidenceId: id });
  await touchCaseForEvidence(tx, row.caseId, false);
  await audit(tx, { userId: user.id, actor: 'user', action: 'evidence.upload.complete', entityType: 'evidence', entityId: id, requestId });
  return { evidence: await getEvidence(tx, id), job };
}

export async function updateEvidence(tx: Tx, user: UserContext, id: string, input: EvidenceUpdateInput, requestId: string): Promise<EvidenceItem> {
  const row = await loadEvidence(tx, id, true);
  await tx`
    update app.evidence_items set
      role = ${input.role ?? row.role},
      caption = ${input.caption === undefined ? row.caption : input.caption}
    where id = ${id}`;
  if (input.role && input.role !== row.role && row.status === 'ready') await touchCaseForEvidence(tx, row.caseId, true);
  await audit(tx, { userId: user.id, actor: 'user', action: 'evidence.update', entityType: 'evidence', entityId: id, requestId });
  return getEvidence(tx, id);
}

export async function reorderEvidence(tx: Tx, user: UserContext, caseId: string, order: string[], requestId: string): Promise<EvidenceItem[]> {
  const rows = await tx<{ id: string }[]>`select id from app.evidence_items where case_id = ${caseId} for update`;
  if (rows.length === 0) {
    const [c] = await tx`select 1 from app.repair_cases where id = ${caseId}`;
    if (!c) throw notFound('That case');
  }
  const ids = new Set(rows.map((r) => r.id));
  if (order.some((id) => !ids.has(id))) throw new AppError('validation_failed', 'The photo order includes photos from another case.');
  for (const [index, id] of order.entries()) {
    await tx`update app.evidence_items set sort_order = ${index} where id = ${id}`;
  }
  await audit(tx, { userId: user.id, actor: 'user', action: 'evidence.reorder', entityType: 'case', entityId: caseId, requestId });
  return listEvidence(tx, caseId);
}

/** Remove a photo: delete stored objects, then the row. Removal of usable evidence is a material change. */
export async function removeEvidence(tx: Tx, user: UserContext, id: string, requestId: string): Promise<void> {
  const row = await loadEvidence(tx, id, true);
  const derivs = await tx<{ objectKey: string }[]>`select object_key from app.media_derivatives where evidence_id = ${id}`;
  await removeObjects([row.originalObjectKey, ...derivs.map((d) => d.objectKey)]);
  await tx`update app.jobs set status = 'cancelled', completed_at = now() where subject_id = ${id} and status in ('queued', 'running')`;
  await tx`delete from app.evidence_items where id = ${id}`;
  await touchCaseForEvidence(tx, row.caseId, row.status === 'ready');
  await audit(tx, { userId: user.id, actor: 'user', action: 'evidence.remove', entityType: 'evidence', entityId: id, requestId });
}
