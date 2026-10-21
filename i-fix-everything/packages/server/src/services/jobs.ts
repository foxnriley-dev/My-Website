import type { Job, JobKind, JobStatus } from '@ife/contracts';
import { iso, isoReq, type Tx, type UserContext } from '../db';
import { notFound } from '../errors';
import { enqueueInTx, QUEUES, type MediaProcessPayload } from '../queue';

interface JobRow {
  id: string;
  kind: JobKind;
  status: JobStatus;
  caseId: string | null;
  subjectId: string | null;
  inputRevision: number | null;
  attempts: number;
  message: string | null;
  errorCode: string | null;
  retryable: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

const JOB_COLS = (tx: Tx) => tx`
  id, kind, status, case_id, subject_id, input_revision, attempts, message, error_code, retryable,
  created_at, updated_at, completed_at`;

export const toJob = (r: JobRow): Job => ({
  ...r,
  createdAt: isoReq(r.createdAt),
  updatedAt: isoReq(r.updatedAt),
  completedAt: iso(r.completedAt),
});

export async function getJob(tx: Tx, id: string): Promise<Job> {
  const [row] = await tx<JobRow[]>`select ${JOB_COLS(tx)} from app.jobs where id = ${id}`;
  if (!row) throw notFound('That job');
  return toJob(row);
}

export async function listCaseJobs(tx: Tx, caseId: string, activeOnly = false): Promise<Job[]> {
  const rows = await tx<JobRow[]>`
    select ${JOB_COLS(tx)} from app.jobs
    where case_id = ${caseId} ${activeOnly ? tx`and status in ('queued', 'running')` : tx``}
    order by created_at desc limit 50`;
  return rows.map(toJob);
}

/**
 * Create the user-visible job and the durable queue entry in one transaction.
 * The idempotency key makes duplicate completion calls return the same job.
 */
export async function enqueueMediaJob(
  tx: Tx,
  user: UserContext,
  input: { caseId: string; evidenceId: string },
): Promise<Job> {
  const key = `media_process:${input.evidenceId}`;
  const [inputRevision] = await tx<{ inputRevision: number }[]>`select input_revision from app.repair_cases where id = ${input.caseId}`;
  const [inserted] = await tx<{ id: string }[]>`
    insert into app.jobs (user_id, case_id, subject_id, kind, status, input_revision, message, idempotency_key)
    values (${user.id}, ${input.caseId}, ${input.evidenceId}, 'media_process', 'queued', ${inputRevision?.inputRevision ?? null},
            'Waiting to check your photo', ${key})
    on conflict (user_id, idempotency_key) do nothing
    returning id`;
  if (inserted) {
    const payload: MediaProcessPayload = { jobId: inserted.id, evidenceId: input.evidenceId, userId: user.id };
    await enqueueInTx(tx, QUEUES.mediaProcess, payload, inserted.id);
    return getJob(tx, inserted.id);
  }
  const [existing] = await tx<{ id: string }[]>`select id from app.jobs where user_id = ${user.id} and idempotency_key = ${key}`;
  return getJob(tx, existing!.id);
}
