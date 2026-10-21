import type {
  CaseIntake,
  CaseStatus,
  EvidenceStatus,
  MachineCategory,
  PowerType,
  ReadinessItem,
  RiskAnswers,
  SafetyHold,
  StartBehavior,
} from '@ife/contracts';
import { riskQuestionsFor } from './risk';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** Wording adapts to whether the machine has an engine or an electric motor. */
export function startQuestion(power: PowerType | null): { prompt: string; options: ChoiceOption<StartBehavior>[] } {
  if (power === 'electric') {
    return {
      prompt: 'What happens when you try to turn it on or ride it?',
      options: [
        { value: 'no_power', label: 'Nothing — no lights or display' },
        { value: 'starts_then_dies', label: 'Powers on, then cuts out' },
        { value: 'runs_poorly', label: 'Powers on but motor is weak, jerky or noisy' },
        { value: 'runs_normally', label: 'Works normally — the problem is something else' },
        { value: 'unknown', label: 'Not sure' },
      ],
    };
  }
  return {
    prompt: 'What happens when you try to start it?',
    options: [
      { value: 'does_not_crank', label: 'Nothing, or just a click — the engine does not turn over' },
      { value: 'cranks_no_start', label: 'It turns over but will not start' },
      { value: 'starts_then_dies', label: 'Starts, then dies' },
      { value: 'runs_poorly', label: 'Runs, but poorly (rough, weak, smoky, noisy)' },
      { value: 'runs_normally', label: 'Starts and runs normally — the problem is something else' },
      { value: 'not_applicable', label: 'I have not tried / it is not safe to try' },
      { value: 'unknown', label: 'Not sure' },
    ],
  };
}

export const ONSET_OPTIONS = [
  { value: 'sudden', label: 'Suddenly' },
  { value: 'gradual', label: 'Gradually got worse' },
  { value: 'after_work_or_event', label: 'Right after work, a fill-up, a crash or storage' },
  { value: 'unknown', label: 'Not sure' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'always', label: 'Every time' },
  { value: 'intermittent', label: 'Sometimes' },
  { value: 'happened_once', label: 'It happened once' },
  { value: 'unknown', label: 'Not sure' },
] as const;

export const CONDITION_OPTIONS = [
  { value: 'cold_start', label: 'When cold' },
  { value: 'warmed_up', label: 'After it warms up' },
  { value: 'idle', label: 'At idle' },
  { value: 'under_load', label: 'Under load or uphill' },
  { value: 'at_speed', label: 'At speed' },
  { value: 'braking', label: 'When braking' },
  { value: 'turning', label: 'When turning' },
  { value: 'wet_weather', label: 'In wet weather' },
  { value: 'after_sitting', label: 'After sitting unused' },
  { value: 'after_refueling_or_charging', label: 'After refueling or charging' },
] as const;

export const CHECK_ANSWER_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Not sure' },
  { value: 'cannot_safely_check', label: 'Cannot safely check' },
] as const;

export interface ReadinessInput {
  intake: CaseIntake;
  category: MachineCategory;
  power: PowerType | null;
  evidence: Array<{ status: EvidenceStatus }>;
  identityMissingKeyFields: string[];
  machineRevisionStale: boolean;
}

/** What a case still needs before analysis can be useful. Reported, not enforced, in Milestone 2. */
export function caseReadiness(input: ReadinessInput): ReadinessItem[] {
  const ready = input.evidence.filter((e) => e.status === 'ready').length;
  const inFlight = input.evidence.filter((e) => ['pending_upload', 'uploaded', 'processing'].includes(e.status)).length;
  const answered = riskQuestionsFor(input.category, input.power).filter((q) => input.intake.risk[q.id] !== undefined);
  const totalRisk = riskQuestionsFor(input.category, input.power).length;
  return [
    {
      key: 'concern',
      ok: input.intake.symptoms.concern.trim().length >= 10,
      message:
        input.intake.symptoms.concern.trim().length >= 10
          ? 'Problem described'
          : 'Describe the problem in a sentence or two',
    },
    {
      key: 'photos',
      ok: ready > 0,
      message: ready > 0 ? `${ready} photo${ready === 1 ? '' : 's'} ready` : 'Add at least one photo',
    },
    {
      key: 'photos_processing',
      ok: inFlight === 0,
      message: inFlight === 0 ? 'No uploads in progress' : `${inFlight} photo${inFlight === 1 ? '' : 's'} still uploading or processing`,
    },
    {
      key: 'risk_checks',
      ok: answered.length === totalRisk,
      message:
        answered.length === totalRisk
          ? 'Safety questions answered'
          : `${totalRisk - answered.length} safety question${totalRisk - answered.length === 1 ? '' : 's'} unanswered`,
    },
    {
      key: 'identity',
      ok: input.identityMissingKeyFields.length === 0,
      message:
        input.identityMissingKeyFields.length === 0
          ? 'Key machine details known'
          : `Unknown: ${input.identityMissingKeyFields.join(', ')} (okay to leave unknown)`,
    },
    {
      key: 'machine_revision',
      ok: !input.machineRevisionStale,
      message: input.machineRevisionStale
        ? 'Machine details changed since this case was opened'
        : 'Using the latest machine details',
    },
  ];
}

/** Milestone 2 status derivation: only states backed by real server work are used. */
export function deriveIntakeStatus(
  current: CaseStatus,
  evidence: Array<{ status: EvidenceStatus }>,
): CaseStatus {
  if (current !== 'draft' && current !== 'awaiting_media') return current;
  const inFlight = evidence.some((e) => ['pending_upload', 'uploaded', 'processing'].includes(e.status));
  return inFlight ? 'awaiting_media' : 'draft';
}

export function riskComplete(answers: RiskAnswers, category: MachineCategory, power: PowerType | null): boolean {
  return riskQuestionsFor(category, power).every((q) => answers[q.id] !== undefined);
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Draft',
  awaiting_media: 'Photos uploading',
  processing: 'Processing',
  needs_information: 'Needs information',
  assessment_ready: 'Assessment ready',
  guide_ready: 'Guide ready',
  repair_in_progress: 'Repair in progress',
  verification_pending: 'Checking the fix',
  resolved: 'Resolved',
  handed_off: 'Handed off',
  archived: 'Archived',
};

export function holdBlocks(hold: SafetyHold): boolean {
  return hold.active;
}
