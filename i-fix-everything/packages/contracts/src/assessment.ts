import { z } from 'zod';
import { Id } from './common';

/**
 * Assessment payload contract (Milestone 3). Defined now so storage, revision
 * handling and clients are built against the final shape. Runtime validation in
 * the server additionally rejects unknown source IDs and risk/action
 * contradictions before anything is published.
 */
export const ASSESSMENT_SCHEMA_VERSION = '2026-10-01' as const;

export const EvidenceLabel = z.enum(['insufficient_information', 'tentative', 'supported', 'confirmed_by_test']);
export type EvidenceLabel = z.infer<typeof EvidenceLabel>;

export const ObservationKind = z.enum(['observation', 'user_report', 'measurement', 'inference']);

export const AssessmentPayload = z.object({
  schema_version: z.literal(ASSESSMENT_SCHEMA_VERSION),
  case_id: Id,
  input_revision: z.number().int().nonnegative(),
  identity_status: z.enum(['unknown', 'partial', 'sufficient_for_task', 'confirmed']),
  summary: z.string().max(2000),
  observations: z.array(
    z.object({
      id: z.string(),
      kind: ObservationKind,
      text: z.string().max(1000),
      evidence_ids: z.array(Id),
    }),
  ),
  hypotheses: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(200),
        label: EvidenceLabel,
        supporting: z.array(z.string()),
        contradicting: z.array(z.string()),
        distinguishing_check: z.string().max(1000).nullable(),
        source_refs: z.array(Id),
      }),
    )
    .max(5),
  missing_information: z.array(z.object({ field: z.string(), why: z.string() })),
  next_action: z.object({
    kind: z.enum(['identify_machine', 'answer_questions', 'perform_check', 'review_guide', 'handoff', 'stop_for_safety']),
    text: z.string().max(1000),
  }),
  risk: z.object({ hold: z.boolean(), codes: z.array(z.string()) }),
  source_refs: z.array(Id),
  limitations: z.array(z.string()),
  capabilities: z.object({
    suggested_guide: z.boolean(),
    suggested_parts: z.boolean(),
    suggested_videos: z.boolean(),
  }),
});
export type AssessmentPayload = z.infer<typeof AssessmentPayload>;
