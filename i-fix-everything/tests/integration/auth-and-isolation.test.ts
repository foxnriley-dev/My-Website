import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeSql } from '@ife/server';
import { api, createUser, machineInput, type TestUser } from '../helpers/api';

afterAll(async () => {
  await closeSql();
});

describe('authentication (shared by web, iOS and Android clients)', () => {
  it('rejects requests without a token', async () => {
    const res = await api(null, 'GET', '/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('rejects a forged token', async () => {
    const fake = { id: randomUUID(), email: 'x', token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig', signOut: async () => {} };
    const res = await api(fake, 'GET', '/me');
    expect(res.status).toBe(401);
  });

  it('accepts a valid session and creates a profile on first use', async () => {
    const u = await createUser('valid');
    const res = await api(u, 'GET', '/me');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(u.id);
    expect(res.body.preferences.unitSystem).toBe('us_customary');
    expect(res.body.entitlement.tier).toBe('free');
    expect(res.body.entitlement.billingEnabled).toBe(false);
  });

  it('logout removes protected access even before the access token expires', async () => {
    const u = await createUser('logout');
    expect((await api(u, 'GET', '/machines')).status).toBe(200);
    await u.signOut();
    const after = await api(u, 'GET', '/machines');
    expect(after.status).toBe(401);
  });

  it('returns client_outdated for installed apps below the minimum version', async () => {
    const u = await createUser('outdated');
    const res = await api(u, 'GET', '/me', undefined, { 'x-ife-client': 'ios/0.0.1' });
    expect(res.status).toBe(426);
    expect(res.body.error.code).toBe('client_outdated');
    expect((await api(u, 'GET', '/me', undefined, { 'x-ife-client': 'android/0.1.0' })).status).toBe(200);
  });

  it('exposes public meta with honest capability flags', async () => {
    const res = await api(null, 'GET', '/meta');
    expect(res.status).toBe(200);
    expect(res.body.capabilities).toMatchObject({ assessment: false, parts: false, videos: false, guides: false, billing: false });
    expect(res.body.demoMode).toBe(false);
  });
});

describe('two accounts cannot access each other’s data', () => {
  let a: TestUser;
  let b: TestUser;
  let machineId: string;
  let caseId: string;
  let evidenceId: string;

  beforeAll(async () => {
    a = await createUser('alice');
    b = await createUser('bob');
    const m = await api(a, 'POST', '/machines', machineInput());
    expect(m.status).toBe(201);
    machineId = m.body.id;
    const c = await api(a, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId });
    expect(c.status).toBe(201);
    caseId = c.body.id;
    const up = await api(a, 'POST', `/cases/${caseId}/evidence/uploads`, {
      idempotencyKey: randomUUID(),
      role: 'overview',
      declaredMime: 'image/jpeg',
      declaredBytes: 1000,
      clientPlatform: 'web',
    });
    expect(up.status).toBe(201);
    evidenceId = up.body.evidence.id;
  });

  it('lists are empty for the other account', async () => {
    expect((await api(b, 'GET', '/machines')).body.machines).toEqual([]);
    expect((await api(b, 'GET', '/cases')).body.cases).toEqual([]);
  });

  it.each([
    ['GET', () => `/machines/${machineId}`],
    ['GET', () => `/machines/${machineId}/revisions`],
    ['GET', () => `/cases/${caseId}`],
    ['GET', () => `/cases/${caseId}/evidence`],
    ['GET', () => `/cases/${caseId}/revisions`],
    ['GET', () => `/evidence/${evidenceId}`],
    ['DELETE', () => `/cases/${caseId}`],
    ['DELETE', () => `/evidence/${evidenceId}`],
    ['POST', () => `/evidence/${evidenceId}/complete`],
  ])('%s %s is not found for another account', async (method, path) => {
    const res = await api(b, method, path());
    expect(res.status).toBe(404);
  });

  it('cannot modify another account’s machine or case', async () => {
    expect((await api(b, 'PATCH', `/machines/${machineId}`, { nickname: 'stolen' })).status).toBe(404);
    expect((await api(b, 'PATCH', `/cases/${caseId}`, { expectedVersion: 0, title: 'stolen' })).status).toBe(404);
    const m = await api(a, 'GET', `/machines/${machineId}`);
    const rev = await api(b, 'POST', `/machines/${machineId}/revisions`, {
      expectedRevision: 1,
      changeNote: null,
      identity: m.body.currentRevision.identity,
      installedComponents: [],
      modifications: [],
    });
    expect(rev.status).toBe(404);
  });

  it('cannot open a case against another account’s machine', async () => {
    const res = await api(b, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId });
    expect(res.status).toBe(404);
  });

  it('cannot attach uploads to another account’s case', async () => {
    const res = await api(b, 'POST', `/cases/${caseId}/evidence/uploads`, {
      idempotencyKey: randomUUID(),
      role: 'overview',
      declaredMime: 'image/jpeg',
      declaredBytes: 1000,
      clientPlatform: 'ios',
    });
    expect(res.status).toBe(404);
  });

  it('cannot reorder using another account’s evidence id', async () => {
    const bm = await api(b, 'POST', '/machines', machineInput());
    const bc = await api(b, 'POST', '/cases', { idempotencyKey: randomUUID(), machineId: bm.body.id });
    const res = await api(b, 'PUT', `/cases/${bc.body.id}/evidence/order`, { order: [evidenceId] });
    expect(res.status).toBe(400);
  });

  it('data persists for the owner across fresh requests', async () => {
    const res = await api(a, 'GET', `/cases/${caseId}`);
    expect(res.status).toBe(200);
    expect(res.body.case.machineId).toBe(machineId);
  });
});
