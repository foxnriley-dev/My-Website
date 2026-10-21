import { z } from 'zod';
import { Id, Timestamp } from './common';

export const JobKind = z.enum(['media_process', 'assessment', 'resource_resolution', 'export', 'deletion']);
export type JobKind = z.infer<typeof JobKind>;

export const JobStatus = z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'superseded']);
export type JobStatus = z.infer<typeof JobStatus>;

export const Job = z.object({
  id: Id,
  kind: JobKind,
  status: JobStatus,
  caseId: Id.nullable(),
  subjectId: Id.nullable(),
  inputRevision: z.number().int().nullable(),
  attempts: z.number().int(),
  /** Neutral, user-safe progress text. Never unvalidated mechanical advice. */
  message: z.string().nullable(),
  errorCode: z.string().nullable(),
  retryable: z.boolean(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt: Timestamp.nullable(),
});
export type Job = z.infer<typeof Job>;
