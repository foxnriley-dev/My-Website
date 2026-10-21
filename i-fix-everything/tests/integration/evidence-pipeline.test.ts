import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeSql, getQueue, QUEUES, stopQueue, withSystem, type MediaProcessPayload } from '@ife/server';
import { handleMediaJob, sweepAbandonedUploads } from '../../apps/worker/src/main';
import { api, createUser, grantPro, machineInput, uploadTo, type TestUser } from '../helpers/api';
import { jpegWithGps, notAnImage, pngImage } from '../helpers/images';

let u: TestUser;
let caseId: string;

beforeAll(async () => {
  u = await createUser('media');
  const m = await api(u, 'POST', '/machines', machineInput());
  caseId = (await api(u, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId: m.body.id })).body.id;
  // Run the real worker against the durable queue for this file.
  const boss = await getQueue();
  await boss.work<MediaProcessPayload>(
    QUEUES.mediaProcess,
    { includeMetadata: true, batchSize: 1, pollingIntervalSeconds: 0.5 },
    async ([job]) => {
      if (job) await handleMediaJob(job.data, job.retryCount);
    },
  );
});

afterAll(async () => {
  await stopQueue();
  await closeSql();
});

async function startUpload(user: TestUser, kase: string, bytes: number, mime = 'image/jpeg', key = randomUUID()) {
  return api(user, 'POST', `/cases/${kase}/evidence/uploads`, {
    idempotencyKey: key,
    role: 'concern_closeup',
    declaredMime: mime,
    declaredBytes: bytes,
    clientPlatform: 'android',
  });
}

async function waitForStatus(evidenceId: string, statuses: string[], timeoutMs = 20_000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const res = await api(u, 'GET', `/evidence/${evidenceId}`);
    if (statuses.includes(res.body.status)) return res.body;
    if (Date.now() > until) throw new Error(`timed out waiting for ${statuses.join('/')}, last=${res.body.status}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

describe('evidence intake pipeline', () => {
  it('uploads directly to private storage, validates in the worker, and serves only stripped derivatives', async () => {
    const photo = await jpegWithGps(1200, 900);
    const start = await startUpload(u, caseId, photo.byteLength);
    expect(start.status).toBe(201);
    expect(start.body.evidence.status).toBe('pending_upload');
    expect(start.body.upload.method).toBe('PUT');
    // Server-generated key: owner/case/evidence — nothing derived from a client file name.
    expect(start.body.upload.url).toContain(`${u.id}/${caseId}/${start.body.evidence.id}/original`);

    expect((await api(u, 'GET', `/cases/${caseId}`)).body.case.status).toBe('awaiting_media');
    expect(await uploadTo(start.body.upload.url, photo, 'image/jpeg')).toBe(200);
    const done = await api(u, 'POST', `/evidence/${start.body.evidence.id}/complete`);
    expect(done.status).toBe(200);
    expect(done.body.job.kind).toBe('media_process');

    // Duplicate completion does not queue duplicate work.
    const dup = await api(u, 'POST', `/evidence/${start.body.evidence.id}/complete`);
    expect(dup.body.job.id).toBe(done.body.job.id);

    const ready = await waitForStatus(start.body.evidence.id, ['ready']);
    expect(ready.detectedMime).toBe('image/jpeg');
    expect(ready.preview.url).toMatch(/token=/);
    expect(ready.thumb.url).toMatch(/token=/);

    const derivative = Buffer.from(await (await fetch(ready.preview.url)).arrayBuffer());
    const meta = await sharp(derivative).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined(); // location metadata removed

    const job = await api(u, 'GET', `/jobs/${done.body.job.id}`);
    expect(job.body.status).toBe('succeeded');
    const kase = (await api(u, 'GET', `/cases/${caseId}`)).body.case;
    expect(kase.status).toBe('draft');
    expect(kase.readiness.find((r: { key: string }) => r.key === 'photos').ok).toBe(true);
  });

  it('keeps media private: no public object URL and no anonymous storage access', async () => {
    const [ev] = await withSystem((tx) => tx<{ originalObjectKey: string }[]>`
      select original_object_key from app.evidence_items where case_id = ${caseId} and status = 'ready' limit 1`);
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/case-media/${ev!.originalObjectKey}`;
    expect((await fetch(publicUrl)).status).toBeGreaterThanOrEqual(400);
    const anon = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/case-media/${ev!.originalObjectKey}`, {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY!, authorization: `Bearer ${u.token}` },
    });
    expect(anon.status).toBeGreaterThanOrEqual(400); // even the owner's own JWT has no direct storage policy
  });

  it('rejects a file whose bytes are not an image, regardless of the declared type, and removes it', async () => {
    const bad = notAnImage();
    const start = await startUpload(u, caseId, bad.byteLength);
    expect(await uploadTo(start.body.upload.url, bad, 'image/jpeg')).toBe(200);
    await api(u, 'POST', `/evidence/${start.body.evidence.id}/complete`);
    const rejected = await waitForStatus(start.body.evidence.id, ['rejected']);
    expect(rejected.rejectionReason).toBe('unsupported_type');
    const [row] = await withSystem((tx) => tx<{ originalObjectKey: string }[]>`
      select original_object_key from app.evidence_items where id = ${start.body.evidence.id}`);
    const { data } = await (await import('@ife/server')).adminClient().storage.from('case-media').exists(row!.originalObjectKey);
    expect(data).toBe(false);
  });

  it('refuses unsupported declared types and oversize files before issuing an upload URL', async () => {
    const gif = await startUpload(u, caseId, 1000, 'image/gif');
    expect(gif.status).toBe(415);
    const big = await startUpload(u, caseId, 20 * 1024 * 1024);
    expect(big.status).toBe(413);
  });

  it('completing before the file arrives is a retryable error, and each file retries independently', async () => {
    const png = await pngImage();
    const a = await startUpload(u, caseId, png.byteLength, 'image/png');
    const b = await startUpload(u, caseId, png.byteLength, 'image/png');
    const early = await api(u, 'POST', `/evidence/${a.body.evidence.id}/complete`);
    expect(early.status).toBe(400);
    expect(early.body.error.retryable).toBe(true);
    // b succeeds while a is still pending.
    await uploadTo(b.body.upload.url, png, 'image/png');
    await api(u, 'POST', `/evidence/${b.body.evidence.id}/complete`);
    await waitForStatus(b.body.evidence.id, ['ready']);
    // a retries with the same idempotency key and gets a fresh upload URL for the same item.
    const retry = await api(u, 'POST', `/cases/${caseId}/evidence/uploads`, {
      idempotencyKey: (await withSystem((tx) => tx<{ idempotencyKey: string }[]>`
        select idempotency_key from app.evidence_items where id = ${a.body.evidence.id}`))[0]!.idempotencyKey,
      role: 'concern_closeup',
      declaredMime: 'image/png',
      declaredBytes: png.byteLength,
      clientPlatform: 'android',
    });
    expect(retry.body.evidence.id).toBe(a.body.evidence.id);
    await uploadTo(retry.body.upload.url, png, 'image/png');
    await api(u, 'POST', `/evidence/${a.body.evidence.id}/complete`);
    await waitForStatus(a.body.evidence.id, ['ready']);
  });

  it('reorders and removes photos; removing usable evidence is a material change', async () => {
    const list = (await api(u, 'GET', `/cases/${caseId}/evidence`)).body.evidence as { id: string; status: string }[];
    const ready = list.filter((e) => e.status === 'ready');
    const reversed = [...ready].reverse().map((e) => e.id);
    const reordered = await api(u, 'PUT', `/cases/${caseId}/evidence/order`, { order: reversed });
    expect(reordered.body.evidence.filter((e: { status: string }) => e.status === 'ready').map((e: { id: string }) => e.id)).toEqual(reversed);

    const before = (await api(u, 'GET', `/cases/${caseId}`)).body.case.inputRevision;
    expect((await api(u, 'DELETE', `/evidence/${reversed[0]}`)).status).toBe(200);
    expect((await api(u, 'GET', `/cases/${caseId}`)).body.case.inputRevision).toBe(before + 1);
    expect((await api(u, 'GET', `/evidence/${reversed[0]}`)).status).toBe(404);
  });

  it('caps photos per case at 8', async () => {
    const v = await createUser('cap');
    await grantPro(v.id);
    const m = await api(v, 'POST', '/machines', machineInput());
    const k = (await api(v, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId: m.body.id })).body.id;
    for (let i = 0; i < 8; i++) expect((await startUpload(v, k, 1000)).status).toBe(201);
    const ninth = await startUpload(v, k, 1000);
    expect(ninth.status).toBe(403);
    expect(ninth.body.error.code).toBe('limit_reached');
  });

  it('a job for removed evidence is cancelled instead of processed (stale work cannot resurrect it)', async () => {
    const png = await pngImage();
    const s = await startUpload(u, caseId, png.byteLength, 'image/png');
    await uploadTo(s.body.upload.url, png, 'image/png');
    // Simulate a job that is still queued when the user removes the photo.
    await withSystem((tx) => tx`update app.evidence_items set status = 'uploaded' where id = ${s.body.evidence.id}`);
    const [jobRow] = await withSystem((tx) => tx<{ id: string }[]>`
      insert into app.jobs (user_id, case_id, subject_id, kind, idempotency_key)
      values (${u.id}, ${caseId}, ${s.body.evidence.id}, 'media_process', ${'test:' + randomUUID()}) returning id`);
    await api(u, 'DELETE', `/evidence/${s.body.evidence.id}`);
    await handleMediaJob({ jobId: jobRow!.id, evidenceId: s.body.evidence.id, userId: u.id }, 0);
    const job = await api(u, 'GET', `/jobs/${jobRow!.id}`);
    expect(job.body.status).toBe('cancelled');
  });

  it('sweeps upload sessions that never completed', async () => {
    const s = await startUpload(u, caseId, 1000);
    await withSystem((tx) => tx`update app.evidence_items set created_at = now() - interval '2 days' where id = ${s.body.evidence.id}`);
    expect(await sweepAbandonedUploads()).toBeGreaterThanOrEqual(1);
    expect((await api(u, 'GET', `/evidence/${s.body.evidence.id}`)).body.rejectionReason).toBe('missing_upload');
  });
});

describe('deletion', () => {
  it('deleting a case removes its stored objects and rows', async () => {
    const v = await createUser('delcase');
    const m = await api(v, 'POST', '/machines', machineInput());
    const k = (await api(v, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId: m.body.id })).body.id;
    const png = await pngImage();
    const s = await api(v, 'POST', `/cases/${k}/evidence/uploads`, {
      idempotencyKey: randomUUID(), role: 'overview', declaredMime: 'image/png', declaredBytes: png.byteLength, clientPlatform: 'ios',
    });
    await uploadTo(s.body.upload.url, png, 'image/png');
    const del = await api(v, 'DELETE', `/cases/${k}`);
    expect(del.status).toBe(200);
    expect(del.body.objectsRemoved).toBe(1);
    expect((await api(v, 'GET', `/cases/${k}`)).status).toBe(404);
  });

  it('deleting the account removes storage, rows and the login', async () => {
    const v = await createUser('delacct');
    await api(v, 'POST', '/machines', machineInput());
    const bad = await api(v, 'POST', '/me/deletion', { confirm: 'yes' });
    expect(bad.status).toBe(400);
    const res = await api(v, 'POST', '/me/deletion', { confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect((await api(v, 'GET', '/me')).status).toBe(401);
    const [{ count }] = await withSystem((tx) => tx<{ count: number }[]>`select count(*)::int as count from app.machines where user_id = ${v.id}`);
    expect(count).toBe(0);
  });

  it('exports the user’s own data only', async () => {
    const v = await createUser('export');
    await api(v, 'POST', '/machines', machineInput());
    const res = await api(v, 'GET', '/me/export');
    expect(res.status).toBe(200);
    expect(res.body.machines).toHaveLength(1);
    expect(res.body.me.userId).toBe(v.id);
  });
});
