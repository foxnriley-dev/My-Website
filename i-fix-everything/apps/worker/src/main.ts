import {
  closeSql,
  download,
  getEnv,
  getQueue,
  media,
  MEDIA_QUEUE_OPTIONS,
  objectKeys,
  putObject,
  QUEUES,
  removeObjects,
  stopQueue,
  withSystem,
  type MediaProcessPayload,
} from '@ife/server';
import { processImage } from './process-media';

const log = (level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ level, msg, service: 'worker', ...extra }));

export async function handleMediaJob(payload: MediaProcessPayload, retryCount: number): Promise<void> {
  const claim = await media.claimMediaJob(payload.jobId, payload.evidenceId, payload.userId);
  if (!claim) {
    log('info', 'media_job_skipped', { jobId: payload.jobId });
    return;
  }
  try {
    const original = await download(claim.originalObjectKey);
    const result = await processImage(original);
    if (!result.ok) {
      // Rejected files are not kept: remove the quarantined original.
      await removeObjects([claim.originalObjectKey]);
      await media.markMediaRejected(payload.jobId, claim, result.reason);
      log('info', 'media_rejected', { jobId: payload.jobId, reason: result.reason });
      return;
    }
    const records = [];
    for (const d of result.derivatives) {
      const key = objectKeys.derivative(claim.userId, claim.caseId, claim.evidenceId, d.kind, d.ext);
      await putObject(key, d.buffer, d.mime);
      records.push({ kind: d.kind, objectKey: key, mime: d.mime, width: d.width, height: d.height, bytes: d.buffer.byteLength });
    }
    const stillExists = await media.markMediaReady(payload.jobId, claim, result, records);
    if (!stillExists) await removeObjects(records.map((r) => r.objectKey));
    log('info', 'media_ready', { jobId: payload.jobId });
  } catch (err) {
    const final = retryCount >= MEDIA_QUEUE_OPTIONS.retryLimit;
    await media.markMediaAttemptFailed(payload.jobId, claim, final);
    log(final ? 'error' : 'warn', 'media_attempt_failed', { jobId: payload.jobId, retryCount, final, err: String(err) });
    if (!final) throw err; // let the durable queue retry with backoff
  }
}

/** Upload sessions that never completed are cleaned up so they do not count toward limits. */
export async function sweepAbandonedUploads(): Promise<number> {
  const stale = await withSystem((tx) =>
    tx<{ id: string; originalObjectKey: string; caseId: string }[]>`
      select id, original_object_key, case_id from app.evidence_items
      where status = 'pending_upload' and created_at < now() - interval '24 hours'
      limit 200`,
  );
  if (stale.length === 0) return 0;
  await removeObjects(stale.map((s) => s.originalObjectKey));
  await withSystem(async (tx) => {
    await tx`update app.evidence_items set status = 'rejected', rejection_reason = 'missing_upload', processed_at = now()
             where id = any(${stale.map((s) => s.id)}::uuid[]) and status = 'pending_upload'`;
  });
  return stale.length;
}

async function main() {
  const env = getEnv();
  log('info', 'worker_starting', { env: env.APP_ENV });
  const boss = await getQueue();
  await boss.work<MediaProcessPayload>(
    QUEUES.mediaProcess,
    { includeMetadata: true, batchSize: 1, pollingIntervalSeconds: 1 },
    async ([job]) => {
      if (!job) return;
      await handleMediaJob(job.data, job.retryCount);
    },
  );
  const sweep = setInterval(() => {
    sweepAbandonedUploads()
      .then((n) => n && log('info', 'swept_abandoned_uploads', { count: n }))
      .catch((err) => log('error', 'sweep_failed', { err: String(err) }));
  }, 10 * 60_000);

  const shutdown = async (signal: string) => {
    log('info', 'worker_stopping', { signal });
    clearInterval(sweep);
    await stopQueue();
    await closeSql();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  log('info', 'worker_ready', { queues: [QUEUES.mediaProcess] });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  main().catch((err) => {
    log('error', 'worker_crashed', { err: String(err) });
    process.exit(1);
  });
}
