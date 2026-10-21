import { z } from 'zod';
import { Id, Timestamp } from './common';
import { MachineCategory, PowerType } from './machine';

export const CaseStatus = z.enum([
  'draft',
  'awaiting_media',
  'processing',
  'needs_information',
  'assessment_ready',
  'guide_ready',
  'repair_in_progress',
  'verification_pending',
  'resolved',
  'handed_off',
  'archived',
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

/** "Unknown", "Skipped" and "Cannot safely check" are never treated as a negative result. */
export const CheckAnswer = z.enum(['yes', 'no', 'unknown', 'skipped', 'cannot_safely_check']);
export type CheckAnswer = z.infer<typeof CheckAnswer>;

export const StartBehavior = z.enum([
  'does_not_crank',
  'cranks_no_start',
  'starts_then_dies',
  'runs_poorly',
  'runs_normally',
  'no_power',
  'not_applicable',
  'unknown',
]);
export type StartBehavior = z.infer<typeof StartBehavior>;

export const Onset = z.enum(['sudden', 'gradual', 'after_work_or_event', 'unknown']);
export const Frequency = z.enum(['always', 'intermittent', 'happened_once', 'unknown']);
export const Condition = z.enum([
  'cold_start',
  'warmed_up',
  'idle',
  'under_load',
  'at_speed',
  'braking',
  'turning',
  'wet_weather',
  'after_sitting',
  'after_refueling_or_charging',
]);
export type Condition = z.infer<typeof Condition>;

export const Symptoms = z.object({
  concern: z.string().trim().max(4000),
  startBehavior: StartBehavior.nullable(),
  onset: Onset.nullable(),
  frequency: Frequency.nullable(),
  conditions: z.array(Condition).max(10),
  recentWork: z.string().trim().max(2000),
  warningCodes: z.array(z.string().trim().min(1).max(32)).max(20),
  previousAttempts: z.string().trim().max(2000),
});
export type Symptoms = z.infer<typeof Symptoms>;

export const EMPTY_SYMPTOMS: Symptoms = {
  concern: '',
  startBehavior: null,
  onset: null,
  frequency: null,
  conditions: [],
  recentWork: '',
  warningCodes: [],
  previousAttempts: '',
};

export const RiskQuestionId = z.enum([
  'fuel_leak_or_smell',
  'smoke_or_burning',
  'battery_damage',
  'exposed_wiring_or_sparks',
  'brakes_or_steering',
  'overheating_or_pressure',
]);
export type RiskQuestionId = z.infer<typeof RiskQuestionId>;

export const RiskAnswers = z.partialRecord(RiskQuestionId, CheckAnswer);
export type RiskAnswers = z.infer<typeof RiskAnswers>;

export const HoldCode = z.enum([
  'fuel_leak',
  'smoke_or_fire',
  'battery_damage',
  'electrical_hazard',
  'brakes_or_steering',
  'overheating_or_pressure',
]);
export type HoldCode = z.infer<typeof HoldCode>;

export const SafetyHoldReason = z.object({
  code: HoldCode,
  title: z.string(),
  guidance: z.array(z.string()),
  /** What triggered it: a risk answer or wording in the description. */
  source: z.enum(['risk_answer', 'description']),
  specialistRecommended: z.boolean(),
});
export type SafetyHoldReason = z.infer<typeof SafetyHoldReason>;

export const SafetyHold = z.object({
  active: z.boolean(),
  reasons: z.array(SafetyHoldReason),
  /** Risk questions still unanswered/unknown — uncertainty, not proof of safety. */
  unresolvedChecks: z.array(RiskQuestionId),
});
export type SafetyHold = z.infer<typeof SafetyHold>;

export const CaseIntake = z.object({
  symptoms: Symptoms,
  risk: RiskAnswers,
});
export type CaseIntake = z.infer<typeof CaseIntake>;

export const CaseCreateInput = z.object({
  idempotencyKey: Id,
  machineId: Id,
  title: z.string().trim().max(120).optional(),
});
export type CaseCreateInput = z.infer<typeof CaseCreateInput>;

export const CaseUpdateInput = z.object({
  expectedVersion: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(120).optional(),
  archived: z.boolean().optional(),
});
export type CaseUpdateInput = z.infer<typeof CaseUpdateInput>;

export const CaseIntakeUpdateInput = CaseIntake.extend({
  /** The case version the client edited from. A mismatch returns 409 with the current copy. */
  expectedVersion: z.number().int().nonnegative(),
});
export type CaseIntakeUpdateInput = z.infer<typeof CaseIntakeUpdateInput>;

export const CaseVersionInput = z.object({ expectedVersion: z.number().int().nonnegative() });
export type CaseVersionInput = z.infer<typeof CaseVersionInput>;

export const CapabilityState = z.object({
  available: z.boolean(),
  reason: z.enum(['not_built', 'disabled', 'safety_hold', 'missing_information', 'limit_reached', 'ok']),
  message: z.string(),
});
export type CapabilityState = z.infer<typeof CapabilityState>;

export const CaseCapabilities = z.object({
  assessment: CapabilityState,
  parts: CapabilityState,
  videos: CapabilityState,
  guide: CapabilityState,
});
export type CaseCapabilities = z.infer<typeof CaseCapabilities>;

export const ReadinessItem = z.object({
  key: z.enum(['concern', 'photos', 'photos_processing', 'risk_checks', 'identity', 'machine_revision']),
  ok: z.boolean(),
  message: z.string(),
});
export type ReadinessItem = z.infer<typeof ReadinessItem>;

export const RepairCase = z.object({
  id: Id,
  machineId: Id,
  machineNickname: z.string(),
  machineCategory: MachineCategory,
  /** From the pinned machine revision; drives which intake and safety questions apply. */
  machinePowerType: PowerType.nullable(),
  machineRevisionId: Id,
  machineRevisionNumber: z.number().int(),
  /** The machine has a newer identity revision than this case uses. */
  machineRevisionStale: z.boolean(),
  title: z.string(),
  status: CaseStatus,
  safetyHold: SafetyHold,
  /** Increments on every material change (symptoms, risk, evidence, identity). */
  inputRevision: z.number().int().nonnegative(),
  /** Optimistic-concurrency token for edits. */
  version: z.number().int().nonnegative(),
  intake: CaseIntake,
  intakeUpdatedAt: Timestamp,
  lastSavedRevision: z.number().int().nullable(),
  readiness: z.array(ReadinessItem),
  capabilities: CaseCapabilities,
  evidenceCount: z.number().int(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
  archivedAt: Timestamp.nullable(),
});
export type RepairCase = z.infer<typeof RepairCase>;

export const CaseSummary = RepairCase.pick({
  id: true,
  machineId: true,
  machineNickname: true,
  machineCategory: true,
  title: true,
  status: true,
  safetyHold: true,
  evidenceCount: true,
  updatedAt: true,
  createdAt: true,
  archivedAt: true,
});
export type CaseSummary = z.infer<typeof CaseSummary>;

export const CaseRevision = z.object({
  id: Id,
  caseId: Id,
  revision: z.number().int().positive(),
  inputRevision: z.number().int(),
  machineRevisionId: Id,
  intake: CaseIntake,
  evidenceIds: z.array(Id),
  safetyHold: SafetyHold,
  createdAt: Timestamp,
});
export type CaseRevision = z.infer<typeof CaseRevision>;
