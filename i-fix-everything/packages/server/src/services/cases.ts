import {
  EMPTY_SYMPTOMS,
  PowerType,
  type CaseCreateInput,
  type CaseIntake,
  type CaseIntakeUpdateInput,
  type CaseRevision,
  type CaseStatus,
  type CaseSummary,
  type CaseUpdateInput,
  type EvidenceStatus,
  type MachineCategory,
  type MachineIdentity,
  type RepairCase,
  type SafetyHold,
} from '@ife/contracts';
import {
  caseReadiness,
  deriveIntakeStatus,
  effectiveCaseCapabilities,
  evaluateSafety,
  identityCompleteness,
  stableStringify,
} from '@ife/domain';
import { iso, isoReq, type Tx, type UserContext } from '../db';
import { AppError, notFound } from '../errors';
import { listKeys, objectKeys, removeObjects } from '../storage';
import { audit } from './audit';
import { featureSwitches } from './features';

export const DEFAULT_CASE_TITLE = 'New repair';

interface CaseRow {
  id: string;
  userId: string;
  machineId: string;
  machineRevisionId: string;
  title: string;
  status: CaseStatus;
  safetyHold: SafetyHold;
  symptoms: CaseIntake['symptoms'];
  risk: CaseIntake['risk'];
  intakeUpdatedAt: Date;
  inputRevision: number;
  version: number;
  lastSavedRevision: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  machineNickname: string;
  machineCategory: MachineCategory;
  machineCurrentRevision: number;
  pinnedRevision: number;
  pinnedIdentity: MachineIdentity;
}

const CASE_SELECT = (tx: Tx) => tx`
  select c.id, c.user_id, c.machine_id, c.machine_revision_id, c.title, c.status, c.safety_hold,
         c.symptoms, c.risk, c.intake_updated_at, c.input_revision, c.version, c.last_saved_revision,
         c.archived_at, c.created_at, c.updated_at,
         m.nickname as machine_nickname, m.category as machine_category, m.current_revision as machine_current_revision,
         r.revision as pinned_revision, r.identity as pinned_identity
  from app.repair_cases c
  join app.machines m on m.id = c.machine_id
  join app.machine_revisions r on r.id = c.machine_revision_id`;

export function powerTypeOf(identity: MachineIdentity): PowerType | null {
  const parsed = PowerType.safeParse(identity.powerType.value);
  return parsed.success ? parsed.data : null;
}

async function loadRow(tx: Tx, id: string, lock = false): Promise<CaseRow> {
  if (lock) await tx`select 1 from app.repair_cases where id = ${id} for update`;
  const [row] = await tx<CaseRow[]>`${CASE_SELECT(tx)} where c.id = ${id}`;
  if (!row) throw notFound('That case');
  return row;
}

async function evidenceStatuses(tx: Tx, caseId: string): Promise<{ status: EvidenceStatus }[]> {
  return tx<{ status: EvidenceStatus }[]>`select status from app.evidence_items where case_id = ${caseId}`;
}

async function toCase(tx: Tx, row: CaseRow): Promise<RepairCase> {
  const evidence = await evidenceStatuses(tx, row.id);
  const stale = row.pinnedRevision !== row.machineCurrentRevision;
  const intake = { symptoms: row.symptoms, risk: row.risk };
  const switches = await featureSwitches();
  return {
    id: row.id,
    machineId: row.machineId,
    machineNickname: row.machineNickname,
    machineCategory: row.machineCategory,
    machinePowerType: powerTypeOf(row.pinnedIdentity),
    machineRevisionId: row.machineRevisionId,
    machineRevisionNumber: row.pinnedRevision,
    machineRevisionStale: stale,
    title: row.title,
    status: row.status,
    safetyHold: row.safetyHold,
    inputRevision: row.inputRevision,
    version: row.version,
    intake,
    intakeUpdatedAt: isoReq(row.intakeUpdatedAt),
    lastSavedRevision: row.lastSavedRevision,
    readiness: caseReadiness({
      intake,
      category: row.machineCategory,
      power: powerTypeOf(row.pinnedIdentity),
      evidence,
      identityMissingKeyFields: identityCompleteness(row.machineCategory, row.pinnedIdentity).missingKeyFields,
      machineRevisionStale: stale,
    }),
    capabilities: effectiveCaseCapabilities(switches, row.safetyHold),
    evidenceCount: evidence.filter((e) => e.status !== 'rejected').length,
    createdAt: isoReq(row.createdAt),
    updatedAt: isoReq(row.updatedAt),
    archivedAt: iso(row.archivedAt),
  };
}

export async function getCase(tx: Tx, id: string): Promise<RepairCase> {
  return toCase(tx, await loadRow(tx, id));
}

export async function listCases(tx: Tx, opts: { machineId?: string; includeArchived?: boolean } = {}): Promise<CaseSummary[]> {
  const rows = await tx<(CaseRow & { evidenceCount: number })[]>`
    select c.id, c.machine_id, c.title, c.status, c.safety_hold, c.created_at, c.updated_at, c.archived_at,
           m.nickname as machine_nickname, m.category as machine_category,
           (select count(*)::int from app.evidence_items e where e.case_id = c.id and e.status <> 'rejected') as evidence_count
    from app.repair_cases c join app.machines m on m.id = c.machine_id
    where ${opts.machineId ? tx`c.machine_id = ${opts.machineId}` : tx`true`}
      and ${opts.includeArchived ? tx`true` : tx`c.archived_at is null`}
    order by c.updated_at desc
    limit 200`;
  return rows.map((r) => ({
    id: r.id,
    machineId: r.machineId,
    machineNickname: r.machineNickname,
    machineCategory: r.machineCategory,
    title: r.title,
    status: r.status,
    safetyHold: r.safetyHold,
    evidenceCount: r.evidenceCount,
    createdAt: isoReq(r.createdAt),
    updatedAt: isoReq(r.updatedAt),
    archivedAt: iso(r.archivedAt),
  }));
}

export async function createCase(
  tx: Tx,
  user: UserContext,
  input: CaseCreateInput,
  requestId: string,
): Promise<{ case: RepairCase; created: boolean }> {
  const [existing] = await tx<{ id: string }[]>`
    select id from app.repair_cases where user_id = ${user.id} and idempotency_key = ${input.idempotencyKey}`;
  if (existing) return { case: await getCase(tx, existing.id), created: false };

  const [machine] = await tx<{ id: string; category: MachineCategory; archivedAt: Date | null; revisionId: string; identity: MachineIdentity }[]>`
    select m.id, m.category, m.archived_at, r.id as revision_id, r.identity
    from app.machines m join app.machine_revisions r on r.machine_id = m.id and r.revision = m.current_revision
    where m.id = ${input.machineId}`;
  if (!machine) throw notFound('That machine');
  if (machine.archivedAt) throw new AppError('validation_failed', 'Restore this machine before starting a new repair.');

  const intake: CaseIntake = { symptoms: EMPTY_SYMPTOMS, risk: {} };
  const hold = evaluateSafety(intake, machine.category, powerTypeOf(machine.identity));
  const [row] = await tx<{ id: string }[]>`
    insert into app.repair_cases (user_id, machine_id, machine_revision_id, title, symptoms, risk, safety_hold, idempotency_key)
    values (${user.id}, ${machine.id}, ${machine.revisionId}, ${input.title?.trim() || DEFAULT_CASE_TITLE},
            ${tx.json(intake.symptoms)}, ${tx.json(intake.risk)}, ${tx.json(hold)}, ${input.idempotencyKey})
    returning id`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'case.create', entityType: 'case', entityId: row!.id, requestId });
  return { case: await getCase(tx, row!.id), created: true };
}

async function assertVersion(tx: Tx, row: CaseRow, expected: number): Promise<void> {
  if (row.version !== expected) {
    throw new AppError(
      'conflict',
      'This case was changed on another device. Review the latest version, then reapply your changes.',
      { current: await toCase(tx, row) },
    );
  }
}

function autoTitle(current: string, concern: string): string {
  if (current !== DEFAULT_CASE_TITLE) return current;
  const firstLine = concern.trim().split(/\n/)[0] ?? '';
  if (firstLine.length < 4) return current;
  return firstLine.length > 70 ? `${firstLine.slice(0, 67).trimEnd()}…` : firstLine;
}

/**
 * Save intake (symptoms + risk answers). Safety holds are recomputed on every
 * material update; a hold can only clear when the inputs that raised it change.
 */
export async function updateIntake(
  tx: Tx,
  user: UserContext,
  id: string,
  input: CaseIntakeUpdateInput,
  requestId: string,
): Promise<RepairCase> {
  const row = await loadRow(tx, id, true);
  await assertVersion(tx, row, input.expectedVersion);
  if (row.archivedAt) throw new AppError('validation_failed', 'Restore this case before editing it.');

  const next: CaseIntake = { symptoms: input.symptoms, risk: input.risk };
  if (stableStringify(next) === stableStringify({ symptoms: row.symptoms, risk: row.risk })) return toCase(tx, row);

  const hold = evaluateSafety(next, row.machineCategory, powerTypeOf(row.pinnedIdentity));
  await tx`
    update app.repair_cases set
      symptoms = ${tx.json(next.symptoms)},
      risk = ${tx.json(next.risk)},
      safety_hold = ${tx.json(hold)},
      title = ${autoTitle(row.title, next.symptoms.concern)},
      intake_updated_at = now(),
      version = version + 1,
      input_revision = input_revision + 1
    where id = ${id}`;
  await audit(tx, {
    userId: user.id,
    actor: 'user',
    action: 'case.intake.update',
    entityType: 'case',
    entityId: id,
    requestId,
    metadata: { holdActive: hold.active, holdReasonCount: hold.reasons.length },
  });
  return getCase(tx, id);
}

export async function updateCase(tx: Tx, user: UserContext, id: string, input: CaseUpdateInput, requestId: string): Promise<RepairCase> {
  const row = await loadRow(tx, id, true);
  await assertVersion(tx, row, input.expectedVersion);
  const archivedAt = input.archived === undefined ? row.archivedAt : input.archived ? new Date() : null;
  await tx`
    update app.repair_cases set
      title = ${input.title ?? row.title},
      archived_at = ${archivedAt},
      version = version + 1
    where id = ${id}`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'case.update', entityType: 'case', entityId: id, requestId });
  return getCase(tx, id);
}

/** Move the case onto the machine's latest identity revision (a material change). */
export async function useLatestMachineRevision(
  tx: Tx,
  user: UserContext,
  id: string,
  expectedVersion: number,
  requestId: string,
): Promise<RepairCase> {
  const row = await loadRow(tx, id, true);
  await assertVersion(tx, row, expectedVersion);
  const [latest] = await tx<{ id: string; identity: MachineIdentity }[]>`
    select r.id, r.identity from app.machine_revisions r join app.machines m on m.id = r.machine_id
    where m.id = ${row.machineId} and r.revision = m.current_revision`;
  if (!latest || latest.id === row.machineRevisionId) return toCase(tx, row);
  const hold = evaluateSafety({ symptoms: row.symptoms, risk: row.risk }, row.machineCategory, powerTypeOf(latest.identity));
  await tx`
    update app.repair_cases set
      machine_revision_id = ${latest.id},
      safety_hold = ${tx.json(hold)},
      version = version + 1,
      input_revision = input_revision + 1
    where id = ${id}`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'case.machine_revision.update', entityType: 'case', entityId: id, requestId });
  return getCase(tx, id);
}

/** Recompute status after evidence changes and record a material input change. */
export async function touchCaseForEvidence(tx: Tx, caseId: string, material: boolean): Promise<void> {
  const [row] = await tx<{ status: CaseStatus }[]>`select status from app.repair_cases where id = ${caseId} for update`;
  if (!row) return;
  const status = deriveIntakeStatus(row.status, await evidenceStatuses(tx, caseId));
  await tx`
    update app.repair_cases set
      status = ${status},
      input_revision = input_revision + ${material ? 1 : 0}
    where id = ${caseId}`;
}

interface CaseRevisionRow {
  id: string;
  caseId: string;
  revision: number;
  inputRevision: number;
  machineRevisionId: string;
  intake: CaseIntake;
  evidenceIds: string[];
  safetyHold: SafetyHold;
  createdAt: Date;
}

const toCaseRevision = (r: CaseRevisionRow): CaseRevision => ({ ...r, createdAt: isoReq(r.createdAt) });

/**
 * Freeze the current inputs as an immutable case revision. Idempotent: saving
 * again without material changes returns the existing revision.
 */
export async function saveCaseRevision(
  tx: Tx,
  user: UserContext,
  id: string,
  expectedVersion: number,
  requestId: string,
): Promise<{ case: RepairCase; revision: CaseRevision; created: boolean }> {
  const row = await loadRow(tx, id, true);
  await assertVersion(tx, row, expectedVersion);
  const [last] = await tx<CaseRevisionRow[]>`
    select id, case_id, revision, input_revision, machine_revision_id, intake, evidence_ids, safety_hold, created_at
    from app.case_revisions where case_id = ${id} order by revision desc limit 1`;
  if (last && last.inputRevision === row.inputRevision) {
    return { case: await toCase(tx, row), revision: toCaseRevision(last), created: false };
  }
  const evidenceIds = (
    await tx<{ id: string }[]>`select id from app.evidence_items where case_id = ${id} and status = 'ready' order by sort_order, created_at`
  ).map((e) => e.id);
  const revision = (last?.revision ?? 0) + 1;
  const [created] = await tx<CaseRevisionRow[]>`
    insert into app.case_revisions (case_id, user_id, revision, input_revision, machine_revision_id, intake, evidence_ids, safety_hold)
    values (${id}, ${user.id}, ${revision}, ${row.inputRevision}, ${row.machineRevisionId},
            ${tx.json({ symptoms: row.symptoms, risk: row.risk })}, ${evidenceIds}::uuid[], ${tx.json(row.safetyHold)})
    returning id, case_id, revision, input_revision, machine_revision_id, intake, evidence_ids, safety_hold, created_at`;
  await tx`update app.repair_cases set last_saved_revision = ${revision} where id = ${id}`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'case.revision.save', entityType: 'case', entityId: id, requestId, metadata: { revision } });
  return { case: await getCase(tx, id), revision: toCaseRevision(created!), created: true };
}

export async function listCaseRevisions(tx: Tx, id: string): Promise<CaseRevision[]> {
  await loadRow(tx, id);
  const rows = await tx<CaseRevisionRow[]>`
    select id, case_id, revision, input_revision, machine_revision_id, intake, evidence_ids, safety_hold, created_at
    from app.case_revisions where case_id = ${id} order by revision desc`;
  return rows.map(toCaseRevision);
}

/** Permanently delete a case: storage objects first (so failures are retryable), then rows. */
export async function deleteCase(tx: Tx, user: UserContext, id: string, requestId: string): Promise<{ objectsRemoved: number }> {
  const row = await loadRow(tx, id, true);
  const keys = await listKeys(objectKeys.casePrefix(user.id, row.id));
  const objectsRemoved = await removeObjects(keys);
  await tx`delete from app.repair_cases where id = ${id}`;
  await tx`
    insert into app.deletion_requests (user_id, scope, subject_id, status, objects_removed, completed_at)
    values (${user.id}, 'case', ${id}, 'completed', ${objectsRemoved}, now())`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'case.delete', entityType: 'case', entityId: id, requestId, metadata: { objectsRemoved } });
  return { objectsRemoved };
}
