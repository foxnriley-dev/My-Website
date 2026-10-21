import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { ApiError, createApiClient } from '@ife/api-client';
import type { ClientPlatform } from '@ife/contracts';
import { EMPTY_SYMPTOMS } from '@ife/contracts';
import { closeSql, handleApiRequest } from '@ife/server';
import { createUser, machineInput, type TestUser } from '../helpers/api';

afterAll(async () => {
  await closeSql();
});

/** The exact client package the web and native apps ship, wired to the real API handler. */
function clientFor(user: TestUser, platform: ClientPlatform, appVersion = '0.1.0') {
  return createApiClient({
    baseUrl: 'http://localhost:3000',
    platform,
    appVersion,
    getAccessToken: async () => user.token,
    fetchImpl: (input, init) => handleApiRequest(new Request(input as string, init)),
  });
}

describe('one backend for web, iOS and Android', () => {
  it('a machine created on the website appears for the same user on iOS and Android', async () => {
    const u = await createUser('xplat');
    const web = clientFor(u, 'web');
    const ios = clientFor(u, 'ios');
    const android = clientFor(u, 'android');

    const created = await web.machines.create({ ...(machineInput() as Parameters<typeof web.machines.create>[0]) });
    for (const native of [ios, android]) {
      const list = await native.machines.list();
      expect(list.machines.map((m) => m.id)).toContain(created.id);
    }
  });

  it('a case started on Android resumes on iOS with the same saved symptoms', async () => {
    const u = await createUser('resume');
    const android = clientFor(u, 'android');
    const ios = clientFor(u, 'ios');
    const m = await android.machines.create({ ...(machineInput() as Parameters<typeof android.machines.create>[0]) });
    const c = await android.cases.create({ idempotencyKey: randomUUID(), machineId: m.id });
    await android.cases.saveIntake(c.id, { expectedVersion: c.version, symptoms: { ...EMPTY_SYMPTOMS, concern: 'Bogs down under load' }, risk: {} });
    const resumed = await ios.cases.get(c.id);
    expect(resumed.case.intake.symptoms.concern).toBe('Bogs down under load');
  });

  it('concurrent edits from two native devices return a typed conflict with the server copy', async () => {
    const u = await createUser('race');
    const ios = clientFor(u, 'ios');
    const android = clientFor(u, 'android');
    const m = await ios.machines.create({ ...(machineInput() as Parameters<typeof ios.machines.create>[0]) });
    const c = await ios.cases.create({ idempotencyKey: randomUUID(), machineId: m.id });
    await ios.cases.saveIntake(c.id, { expectedVersion: c.version, symptoms: { ...EMPTY_SYMPTOMS, concern: 'iPhone text' }, risk: {} });
    const err = await android.cases
      .saveIntake(c.id, { expectedVersion: c.version, symptoms: { ...EMPTY_SYMPTOMS, concern: 'Android text' }, risk: {} })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('conflict');
    expect(((err as ApiError).current as { intake: { symptoms: { concern: string } } }).intake.symptoms.concern).toBe('iPhone text');
  });

  it('an outdated installed app is told to update, while the current one keeps working', async () => {
    const u = await createUser('minver');
    const old = clientFor(u, 'android', '0.0.9');
    const err = await old.me().catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('client_outdated');
    expect((await clientFor(u, 'android').me()).userId).toBe(u.id);
  });

  it('responses are validated against the shared contracts on the client', async () => {
    const u = await createUser('contract');
    const ios = clientFor(u, 'ios');
    const meta = await ios.meta();
    expect(meta.apiVersion).toBe('v1');
    const me = await ios.me();
    expect(me.entitlement.tier).toBe('free');
  });
});
