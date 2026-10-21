import { PgBoss } from 'pg-boss';
import type { Tx } from './db';
import { getEnv } from './env';

export const QUEUES = {
  mediaProcess: 'media-process',
} as const;

export interface MediaProcessPayload {
  jobId: string;
  evidenceId: string;
  userId: string;
}

/** Retry policy: bounded attempts with exponential backoff (D-009). */
export const MEDIA_QUEUE_OPTIONS = {
  retryLimit: 4,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 300,
  expireInSeconds: 300,
} as const;

let boss: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

/** Lazily started pg-boss instance (shared by API and worker processes). */
export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;
  if (!starting) {
    starting = (async () => {
      const b = new PgBoss({ connectionString: getEnv().DATABASE_URL, max: 4 });
      b.on('error', (err) => console.error(JSON.stringify({ level: 'error', msg: 'queue_error', err: String(err) })));
      await b.start();
      await b.createQueue(QUEUES.mediaProcess, { ...MEDIA_QUEUE_OPTIONS });
      boss = b;
      return b;
    })();
  }
  return starting;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    const b = boss;
    boss = null;
    starting = null;
    await b.stop({ graceful: true, timeout: 10_000 });
  }
}

/**
 * Enqueue inside the caller's transaction so the user-visible job row and the
 * durable queue entry commit (or roll back) together.
 */
export async function enqueueInTx(tx: Tx, queue: string, payload: object, jobId: string): Promise<string | null> {
  const b = await getQueue();
  // The queue tables are not granted to app_user. Only for the pg-boss insert,
  // drop back to the session role, then restore RLS for the rest of the
  // transaction. The payload holds ids that RLS-checked queries already
  // proved belong to the caller (see docs/decisions.md D-009).
  const [{ role }] = (await tx`select current_setting('role') as role`) as unknown as [{ role: string }];
  await tx`select set_config('role', 'none', true)`;
  try {
    return await b.send(queue, payload, {
      // Reuse the app.jobs id as the queue job id so the two records stay linked.
      id: jobId,
      db: { executeSql: async (text: string, values?: unknown[]) => ({ rows: await tx.unsafe(text, values as never[]) }) },
    });
  } finally {
    await tx`select set_config('role', ${role}, true)`;
  }
}
