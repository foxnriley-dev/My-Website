import type { Me, Preferences, PreferencesUpdateInput } from '@ife/contracts';
import { getSql, isoReq, withSystem, type Tx, type UserContext } from '../db';
import { AppError } from '../errors';
import { adminClient, listKeys, objectKeys, removeObjects } from '../storage';
import { audit } from './audit';
import { listCases } from './cases';
import { entitlementSummary } from './entitlements';
import { listMachineRevisions, listMachines } from './machines';
import { listEvidence } from './evidence';

interface ProfileRow {
  unitSystem: Preferences['unitSystem'];
  region: Preferences['region'];
  theme: Preferences['theme'];
  notifyCaseUpdatesByEmail: boolean;
  createdAt: Date;
}

export async function ensureProfile(tx: Tx, user: UserContext): Promise<ProfileRow> {
  await tx`insert into app.profiles (user_id) values (${user.id}) on conflict (user_id) do nothing`;
  const [row] = await tx<ProfileRow[]>`
    select unit_system, region, theme, notify_case_updates_by_email, created_at from app.profiles where user_id = ${user.id}`;
  return row!;
}

export async function getMe(tx: Tx, user: UserContext): Promise<Me> {
  const p = await ensureProfile(tx, user);
  return {
    userId: user.id,
    email: user.email,
    createdAt: isoReq(p.createdAt),
    preferences: { unitSystem: p.unitSystem, region: p.region, theme: p.theme, notifyCaseUpdatesByEmail: p.notifyCaseUpdatesByEmail },
    entitlement: await entitlementSummary(tx, user.id),
  };
}

export async function updatePreferences(tx: Tx, user: UserContext, input: PreferencesUpdateInput, requestId: string): Promise<Me> {
  const p = await ensureProfile(tx, user);
  await tx`
    update app.profiles set
      unit_system = ${input.unitSystem ?? p.unitSystem},
      region = ${input.region ?? p.region},
      theme = ${input.theme ?? p.theme},
      notify_case_updates_by_email = ${input.notifyCaseUpdatesByEmail ?? p.notifyCaseUpdatesByEmail}
    where user_id = ${user.id}`;
  await audit(tx, { userId: user.id, actor: 'user', action: 'preferences.update', entityType: 'profile', entityId: user.id, requestId });
  return getMe(tx, user);
}

/**
 * Personal data export (JSON). Photos are referenced by short-lived signed
 * preview links rather than embedded. Never a paid feature.
 */
export async function exportData(tx: Tx, user: UserContext) {
  const me = await getMe(tx, user);
  const machines = await listMachines(tx, true);
  const machineExports = [];
  for (const m of machines) machineExports.push({ ...m, revisions: await listMachineRevisions(tx, m.id) });
  const cases = await listCases(tx, { includeArchived: true });
  const caseExports = [];
  for (const c of cases) {
    const [row] = await tx<{ symptoms: unknown; risk: unknown; safetyHold: unknown }[]>`
      select symptoms, risk, safety_hold from app.repair_cases where id = ${c.id}`;
    const revisions = await tx`select revision, input_revision, intake, evidence_ids, created_at from app.case_revisions where case_id = ${c.id} order by revision`;
    caseExports.push({ ...c, intake: row, revisions, evidence: await listEvidence(tx, c.id) });
  }
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1 as const,
    me,
    machines: machineExports,
    cases: caseExports,
    notes: [
      'Photo links in this export expire after 5 minutes. Original photos are stored privately and are deleted with the case or account.',
      'Audit records are kept without symptom text or photos.',
    ],
  };
}

/**
 * Account deletion: storage objects first, then the auth user (rows cascade).
 * Backups: see docs/privacy-and-retention.md for the real retention window.
 */
export async function deleteAccount(user: UserContext, requestId: string): Promise<{ objectsRemoved: number; notes: string[] }> {
  const [request] = await withSystem(async (tx) =>
    tx<{ id: string }[]>`
      insert into app.deletion_requests (user_id, scope, status) values (${user.id}, 'account', 'started') returning id`,
  );
  let objectsRemoved = 0;
  try {
    objectsRemoved = await removeObjects(await listKeys(objectKeys.userPrefix(user.id)));
    const { error } = await adminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    await getSql()`update app.deletion_requests set status = 'failed', error_code = 'incomplete' where id = ${request!.id}`;
    console.error(JSON.stringify({ level: 'error', msg: 'account_deletion_failed', requestId, err: String(err) }));
    throw new AppError('service_unavailable', 'We could not finish deleting your account. Nothing else was changed; try again.');
  }
  await getSql()`
    update app.deletion_requests set status = 'completed', objects_removed = ${objectsRemoved}, completed_at = now()
    where id = ${request!.id}`;
  await withSystem((tx) =>
    audit(tx, { userId: null, actor: 'system', action: 'account.delete', entityType: 'account', requestId, metadata: { objectsRemoved } }),
  );
  return {
    objectsRemoved,
    notes: [
      'Your machines, cases, photos and preferences were deleted.',
      'Database backups held by the hosting provider expire on their own schedule; see the privacy page for the current window.',
    ],
  };
}
