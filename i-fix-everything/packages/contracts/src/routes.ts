import { z } from 'zod';
import { Me, DeletionResult } from './account';
import { CaseRevision, CaseSummary, RepairCase } from './case';
import { EvidenceItem, UploadSession } from './evidence';
import { Job } from './jobs';
import { Machine, MachineRevision } from './machine';

/** Response envelopes shared by server and clients. */
export const MachineList = z.object({ machines: z.array(Machine) });
export const MachineRevisionList = z.object({ revisions: z.array(MachineRevision) });
export const CaseList = z.object({ cases: z.array(CaseSummary) });
export const CaseRevisionList = z.object({ revisions: z.array(CaseRevision) });
export const EvidenceList = z.object({ evidence: z.array(EvidenceItem) });
export const JobList = z.object({ jobs: z.array(Job) });
export const CaseWithJobs = z.object({ case: RepairCase, jobs: z.array(Job) });
export const CompleteUploadResult = z.object({ evidence: EvidenceItem, job: Job.nullable() });
export const DataExport = z.object({
  exportedAt: z.string(),
  formatVersion: z.literal(1),
  me: Me,
  machines: z.array(z.unknown()),
  cases: z.array(z.unknown()),
  notes: z.array(z.string()),
});

export { Me, DeletionResult, RepairCase, Machine, UploadSession, Job, EvidenceItem };
