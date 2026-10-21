import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EMPTY_SYMPTOMS } from '@ife/contracts';
import { emptyIdentity, userField } from '@ife/domain';
import { closeSql, withSystem } from '@ife/server';
import { api, createUser, grantPro, machineInput, type TestUser } from '../helpers/api';

afterAll(async () => {
  await closeSql();
});

describe('machines', () => {
  let u: TestUser;
  beforeAll(async () => {
    u = await createUser('garage');
  });

  it('accepts a machine with every identity field unknown', async () => {
    const res = await api(u, 'POST', '/machines', {
      idempotencyKey: randomUUID(),
      category: 'small_engine',
      nickname: 'Mystery mower',
      identity: emptyIdentity(),
      installedComponents: [],
      modifications: [],
    });
    expect(res.status).toBe(201);
    expect(res.body.currentRevision.revision).toBe(1);
    expect(res.body.currentRevision.identity.year).toEqual({ state: 'unknown', value: null, provenance: null, confirmation: 'confirmed' });
    expect(res.body.completeness.known).toBe(0);
  });

  it('rejects a "known" field without a value (no invented values)', async () => {
    const identity = emptyIdentity();
    (identity as any).year = { state: 'known', value: null, provenance: 'user_entered', confirmation: 'confirmed' };
    const res = await api(u, 'POST', '/machines', { ...machineInput(), identity });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
  });

  it('enforces the Free saved-machine limit server-side and never deletes to comply', async () => {
    const v = await createUser('limit');
    expect((await api(v, 'POST', '/machines', machineInput())).status).toBe(201);
    const second = await api(v, 'POST', '/machines', machineInput({ nickname: 'Second' }));
    expect(second.status).toBe(403);
    expect(second.body.error.code).toBe('limit_reached');
    // A client cannot claim Pro: unknown fields are stripped and ignored.
    const spoofed = await api(v, 'POST', '/machines', { ...machineInput({ nickname: 'Spoof' }), tier: 'pro', plan: 'pro' });
    expect(spoofed.status).toBe(403);
    await grantPro(v.id);
    expect((await api(v, 'POST', '/machines', machineInput({ nickname: 'Second' }))).status).toBe(201);
    expect((await api(v, 'GET', '/me')).body.entitlement.tier).toBe('pro');
  });

  it('is idempotent: the same key never creates a duplicate', async () => {
    const w = await createUser('idem');
    const input = machineInput();
    const first = await api(w, 'POST', '/machines', input);
    const second = await api(w, 'POST', '/machines', input);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect((await api(w, 'GET', '/machines')).body.machines).toHaveLength(1);
  });

  it('identity edits create immutable revisions, detect conflicts, and mark dependent cases stale', async () => {
    const p = await createUser('revs');
    await grantPro(p.id);
    const m = (await api(p, 'POST', '/machines', machineInput())).body;
    const kase = (await api(p, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId: m.id })).body;
    expect(kase.machineRevisionStale).toBe(false);

    const identity = { ...m.currentRevision.identity, engineIdentifier: userField('212cc Hemi') };
    const engineSwap = [
      { id: randomUUID(), kind: 'engine', make: 'Predator', model: '224', identifier: null, replacesFactory: true, notes: null, provenance: 'user_entered' },
    ];
    const r2 = await api(p, 'POST', `/machines/${m.id}/revisions`, {
      expectedRevision: 1,
      changeNote: 'Engine swapped',
      identity,
      installedComponents: engineSwap,
      modifications: [],
    });
    expect(r2.status).toBe(201);
    expect(r2.body.revision.revision).toBe(2);
    expect(r2.body.revision.changedFields).toEqual(expect.arrayContaining(['engineIdentifier', 'installedComponents']));

    // Same content again: no new revision.
    const same = await api(p, 'POST', `/machines/${m.id}/revisions`, {
      expectedRevision: 2,
      changeNote: null,
      identity,
      installedComponents: engineSwap,
      modifications: [],
    });
    expect(same.status).toBe(200);
    expect(same.body.changed).toBe(false);

    // A second device editing from revision 1 gets a conflict with the current copy.
    const stale = await api(p, 'POST', `/machines/${m.id}/revisions`, {
      expectedRevision: 1,
      changeNote: null,
      identity: emptyIdentity(),
      installedComponents: [],
      modifications: [],
    });
    expect(stale.status).toBe(409);
    expect(stale.body.error.current.revision).toBe(2);

    const c = (await api(p, 'GET', `/cases/${kase.id}`)).body.case;
    expect(c.machineRevisionStale).toBe(true);
    expect(c.machineRevisionNumber).toBe(1);
    const repinned = await api(p, 'POST', `/cases/${kase.id}/machine-revision`, { expectedVersion: c.version });
    expect(repinned.status).toBe(200);
    expect(repinned.body.machineRevisionStale).toBe(false);
    expect(repinned.body.inputRevision).toBe(c.inputRevision + 1);

    const revs = await api(p, 'GET', `/machines/${m.id}/revisions`);
    expect(revs.body.revisions.map((r: { revision: number }) => r.revision)).toEqual([2, 1]);

    await expect(
      withSystem((tx) => tx`update app.machine_revisions set change_note = 'tampered' where machine_id = ${m.id}`),
    ).rejects.toThrow(/immutable/);
  });
});

describe('cases and intake', () => {
  let u: TestUser;
  let machineId: string;
  beforeAll(async () => {
    u = await createUser('cases');
    machineId = (await api(u, 'POST', '/machines', machineInput())).body.id;
  });

  const newCase = async () => (await api(u, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId })).body;

  it('saves intake, bumps versions, and auto-titles from the concern', async () => {
    const c = await newCase();
    expect(c.status).toBe('draft');
    const res = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Cranks but will not start after sitting all winter', startBehavior: 'cranks_no_start' },
      risk: { fuel_leak_or_smell: 'no', smoke_or_burning: 'no' },
    });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(c.version + 1);
    expect(res.body.inputRevision).toBe(c.inputRevision + 1);
    expect(res.body.title).toMatch(/^Cranks but will not start/);
    expect(res.body.capabilities.assessment).toMatchObject({ available: false, reason: 'not_built' });
  });

  it('returns a conflict with the server copy when another device saved first', async () => {
    const c = await newCase();
    const deviceA = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Edited on the website' },
      risk: {},
    });
    expect(deviceA.status).toBe(200);
    const deviceB = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Edited on the phone' },
      risk: {},
    });
    expect(deviceB.status).toBe(409);
    expect(deviceB.body.error.code).toBe('conflict');
    expect(deviceB.body.error.current.intake.symptoms.concern).toBe('Edited on the website');
    // Nothing was lost: the first save is intact.
    expect((await api(u, 'GET', `/cases/${c.id}`)).body.case.intake.symptoms.concern).toBe('Edited on the website');
  });

  it('raises safety holds from risk answers and from wording, and treats unknown as unresolved', async () => {
    const c = await newCase();
    const res = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Gas is dripping from the carburetor bowl' },
      risk: { fuel_leak_or_smell: 'no', battery_damage: 'unknown', smoke_or_burning: 'cannot_safely_check' },
    });
    expect(res.body.safetyHold.active).toBe(true);
    const fuel = res.body.safetyHold.reasons.find((r: { code: string }) => r.code === 'fuel_leak');
    expect(fuel.source).toBe('description'); // text contradicts the "no" answer; the hold stays
    expect(res.body.safetyHold.unresolvedChecks).toEqual(expect.arrayContaining(['battery_damage', 'smoke_or_burning']));
    expect(res.body.capabilities.assessment.reason).toBe('safety_hold');

    const brakes = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: res.body.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Engine surges at idle' },
      risk: { brakes_or_steering: 'yes' },
    });
    expect(brakes.body.safetyHold.reasons.map((r: { code: string }) => r.code)).toEqual(['brakes_or_steering']);
  });

  it('freezes immutable case revisions and is idempotent when nothing changed', async () => {
    const c = await newCase();
    const saved = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'Chain keeps falling off' },
      risk: {},
    });
    const r1 = await api(u, 'POST', `/cases/${c.id}/revisions`, { expectedVersion: saved.body.version });
    expect(r1.status).toBe(201);
    expect(r1.body.revision.revision).toBe(1);
    const again = await api(u, 'POST', `/cases/${c.id}/revisions`, { expectedVersion: saved.body.version });
    expect(again.status).toBe(200);
    expect(again.body.revision.id).toBe(r1.body.revision.id);
    await expect(
      withSystem((tx) => tx`update app.case_revisions set input_revision = 99 where case_id = ${c.id}`),
    ).rejects.toThrow(/immutable/);
  });

  it('archives and restores a case with version checks', async () => {
    const c = await newCase();
    const archived = await api(u, 'PATCH', `/cases/${c.id}`, { expectedVersion: c.version, archived: true });
    expect(archived.body.archivedAt).not.toBeNull();
    expect((await api(u, 'GET', '/cases')).body.cases.find((x: { id: string }) => x.id === c.id)).toBeUndefined();
    const restored = await api(u, 'PATCH', `/cases/${c.id}`, { expectedVersion: archived.body.version, archived: false });
    expect(restored.body.archivedAt).toBeNull();
  });

  it('returns validation errors with field paths and keeps a stable error shape', async () => {
    const c = await newCase();
    const res = await api(u, 'PUT', `/cases/${c.id}/intake`, {
      expectedVersion: c.version,
      symptoms: { ...EMPTY_SYMPTOMS, concern: 'x'.repeat(5000) },
      risk: {},
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors['symptoms.concern']).toBeDefined();
    expect(res.body.error.retryable).toBe(false);
  });
});
