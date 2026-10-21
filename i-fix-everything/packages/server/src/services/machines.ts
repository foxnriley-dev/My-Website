import {
  MachineIdentityInput,
  type Machine,
  type MachineCategory,
  type MachineCreateInput,
  type MachineRevision,
  type MachineRevisionCreateInput,
  type MachineUpdateInput,
} from '@ife/contracts';
import { canCreateMachine, diffIdentity, identityCompleteness, PLANS } from '@ife/domain';
import { isoReq, iso, type Tx, type UserContext, one } from '../db';
import { AppError, notFound } from '../errors';
import { audit } from './audit';
import { effectiveTier } from './entitlements';

interface RevisionRow {
  id: string;
  machineId: string;
  revision: number;
  identity: MachineIdentityInput['identity'];
  installedComponents: MachineIdentityInput['installedComponents'];
  modifications: MachineIdentityInput['modifications'];
  changedFields: string[];
  changeNote: string | null;
  createdAt: Date;
}

interface MachineRow {
  id: string;
  category: MachineCategory;
  nickname: string;
  currentRevision: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  openCaseCount: number;
}

export function toRevision(r: RevisionRow): MachineRevision {
  return {
    id: r.id,
    machineId: r.machineId,
    revision: r.revision,
    identity: r.identity,
    installedComponents: r.installedComponents,
    modifications: r.modifications,
    changedFields: r.changedFields,
    changeNote: r.changeNote,
    createdAt: isoReq(r.createdAt),
  };
}

function toMachine(m: MachineRow, rev: RevisionRow): Machine {
  const revision = toRevision(rev);
  return {
    id: m.id,
    category: m.category,
    nickname: m.nickname,
    archivedAt: iso(m.archivedAt),
    createdAt: isoReq(m.createdAt),
    updatedAt: isoReq(m.updatedAt),
    currentRevision: revision,
    completeness: identityCompleteness(m.category, revision.identity),
    openCaseCount: m.openCaseCount,
  };
}

const MACHINE_COLUMNS = (tx: Tx) => tx`
  m.id, m.category, m.nickname, m.current_revision, m.archived_at, m.created_at, m.updated_at,
  (select count(*)::int from app.repair_cases c
    where c.machine_id = m.id and c.archived_at is null
      and c.status not in ('resolved', 'handed_off', 'archived')) as open_case_count`;

async function loadRevision(tx: Tx, machineId: string, revision: number): Promise<RevisionRow> {
  const [row] = await tx<RevisionRow[]>`
    select id, machine_id, revision, identity, installed_components, modifications, changed_fields, change_note, created_at
    from app.machine_revisions where machine_id = ${machineId} and revision = ${revision}`;
  if (!row) throw notFound('That machine');
  return row;
}

export async function listMachines(tx: Tx, includeArchived = false): Promise<Machine[]> {
  // RLS restricts rows to the caller; no user_id filter is needed for safety,
  // but it keeps the plan cheap once policies are evaluated.
  const machines = await tx<MachineRow[]>`
    select ${MACHINE_COLUMNS(tx)} from app.machines m
    where ${includeArchived ? tx`true` : tx`m.archived_at is null`}
    order by m.created_at desc`;
  if (machines.length === 0) return [];
  const revs = await tx<RevisionRow[]>`
    select r.id, r.machine_id, r.revision, r.identity, r.installed_components, r.modifications,
           r.changed_fields, r.change_note, r.created_at
    from app.machine_revisions r join app.machines m on m.id = r.machine_id and r.revision = m.current_revision
    where m.id = any(${machines.map((m) => m.id)}::uuid[])`;
  const byMachine = new Map(revs.map((r) => [r.machineId, r]));
  return machines.flatMap((m) => {
    const rev = byMachine.get(m.id);
    return rev ? [toMachine(m, rev)] : [];
  });
}

export async function getMachine(tx: Tx, id: string): Promise<Machine> {
  const [m] = await tx<MachineRow[]>`select ${MACHINE_COLUMNS(tx)} from app.machines m where m.id = ${id}`;
  if (!m) throw notFound('That machine');
  return toMachine(m, await loadRevision(tx, m.id, m.currentRevision));
}

export async function createMachine(
  tx: Tx,
  user: UserContext,
  input: MachineCreateInput,
  requestId: string,
): Promise<{ machine: Machine; created: boolean }> {
  const [existing] = await tx<{ id: string }[]>`
    select id from app.machines where user_id = ${user.id} and idempotency_key = ${input.idempotencyKey}`;
  if (existing) return { machine: await getMachine(tx, existing.id), created: false };

  const { tier } = await effectiveTier(tx, user.id);
  const { count } = await one(tx<{ count: number }[]>`
    select count(*)::int as count from app.machines where user_id = ${user.id} and archived_at is null`);
  if (!canCreateMachine(tier, count)) {
    // Existing machines are never deleted to enforce a limit (B09).
    throw new AppError(
      'limit_reached',
      `Your ${PLANS[tier].displayName} plan can keep ${PLANS[tier].limits.savedMachines} active machine${PLANS[tier].limits.savedMachines === 1 ? '' : 's'}. Archive one to add another.`,
    );
  }

  const [m] = await tx<{ id: string }[]>`
    insert into app.machines (user_id, category, nickname, current_revision, idempotency_key)
    values (${user.id}, ${input.category}, ${input.nickname}, 1, ${input.idempotencyKey})
    returning id`;
  await tx`
    insert into app.machine_revisions (machine_id, user_id, revision, identity, installed_components, modifications, changed_fields, change_note)
    values (${m!.id}, ${user.id}, 1, ${tx.json(input.identity)}, ${tx.json(input.installedComponents)},
            ${tx.json(input.modifications)}, ${['created']}, ${null})`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'machine.create', entityType: 'machine', entityId: m!.id, requestId });
  return { machine: await getMachine(tx, m!.id), created: true };
}

export async function updateMachine(tx: Tx, user: UserContext, id: string, input: MachineUpdateInput, requestId: string): Promise<Machine> {
  const current = await getMachine(tx, id);
  if (input.archived === false && current.archivedAt) {
    const { tier } = await effectiveTier(tx, user.id);
    const { count } = await one(tx<{ count: number }[]>`
      select count(*)::int as count from app.machines where user_id = ${user.id} and archived_at is null`);
    if (!canCreateMachine(tier, count)) {
      throw new AppError('limit_reached', `Your plan's active machine limit is reached. Archive another machine first.`);
    }
  }
  await tx`
    update app.machines set
      nickname = ${input.nickname ?? current.nickname},
      archived_at = ${input.archived === undefined ? (current.archivedAt ? new Date(current.archivedAt) : null) : input.archived ? new Date() : null}
    where id = ${id}`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'machine.update', entityType: 'machine', entityId: id, requestId });
  return getMachine(tx, id);
}

/**
 * Identity changes create an immutable revision. The client must say which
 * revision it edited; if another device saved first the caller gets a conflict
 * with the current copy instead of silently overwriting it.
 */
export async function createMachineRevision(
  tx: Tx,
  user: UserContext,
  machineId: string,
  input: MachineRevisionCreateInput,
  requestId: string,
): Promise<{ machine: Machine; revision: MachineRevision; changed: boolean }> {
  const [m] = await tx<{ currentRevision: number }[]>`
    select current_revision from app.machines where id = ${machineId} for update`;
  if (!m) throw notFound('That machine');
  const latest = await loadRevision(tx, machineId, m.currentRevision);
  if (input.expectedRevision !== m.currentRevision) {
    throw new AppError('conflict', 'These machine details were changed on another device. Review the latest details and try again.', {
      current: toRevision(latest),
    });
  }
  const next = MachineIdentityInput.parse(input);
  const changed = diffIdentity(
    { identity: latest.identity, installedComponents: latest.installedComponents, modifications: latest.modifications },
    next,
  );
  if (changed.length === 0) {
    return { machine: await getMachine(tx, machineId), revision: toRevision(latest), changed: false };
  }
  const revision = m.currentRevision + 1;
  await tx`
    insert into app.machine_revisions (machine_id, user_id, revision, identity, installed_components, modifications, changed_fields, change_note)
    values (${machineId}, ${user.id}, ${revision}, ${tx.json(next.identity)}, ${tx.json(next.installedComponents)},
            ${tx.json(next.modifications)}, ${changed}, ${input.changeNote})`;
  await tx`update app.machines set current_revision = ${revision} where id = ${machineId}`;
  await audit(tx, {
    userId: user.id,
    actor: 'user',
    action: 'machine.revise',
    entityType: 'machine',
    entityId: machineId,
    requestId,
    metadata: { revision, changedFieldCount: changed.length },
  });
  const machine = await getMachine(tx, machineId);
  return { machine, revision: machine.currentRevision, changed: true };
}

export async function listMachineRevisions(tx: Tx, machineId: string): Promise<MachineRevision[]> {
  await getMachine(tx, machineId);
  const rows = await tx<RevisionRow[]>`
    select id, machine_id, revision, identity, installed_components, modifications, changed_fields, change_note, created_at
    from app.machine_revisions where machine_id = ${machineId} order by revision desc`;
  return rows.map(toRevision);
}
