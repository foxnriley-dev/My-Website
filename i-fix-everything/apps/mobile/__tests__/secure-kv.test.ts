import * as SecureStore from 'expo-secure-store';
import { readJson, secureKV, writeJson } from '@/lib/secure-kv';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => store.clear());

test('values larger than one SecureStore entry are chunked and reassembled', async () => {
  const big = 'x'.repeat(5000) + 'END';
  await secureKV.setItem('ife.auth', big);
  expect(await secureKV.getItem('ife.auth')).toBe(big);
  expect([...store.keys()].filter((k) => k.startsWith('ife.auth.')).length).toBeGreaterThan(2);
});

test('shrinking a value removes stale chunks', async () => {
  await secureKV.setItem('k', 'y'.repeat(6000));
  await secureKV.setItem('k', 'short');
  expect(await secureKV.getItem('k')).toBe('short');
  expect(store.has('k.3')).toBe(false);
});

test('a partially written value reads as absent rather than corrupt', async () => {
  await secureKV.setItem('k', 'z'.repeat(4000));
  store.delete('k.1');
  expect(await secureKV.getItem('k')).toBeNull();
});

test('sign-out clearing removes drafts and upload manifests but can keep other keys', async () => {
  await writeJson('drafts.user1.case1', { a: 1 });
  await writeJson('uploads.user1', [{ localId: 'x' }]);
  await secureKV.setItem('ife.auth', 'session');
  await secureKV.clear('drafts.');
  await secureKV.clear('uploads.');
  expect(await readJson('drafts.user1.case1')).toBeNull();
  expect(await readJson('uploads.user1')).toBeNull();
  expect(await secureKV.getItem('ife.auth')).toBe('session');
  await secureKV.clear();
  expect(await secureKV.getItem('ife.auth')).toBeNull();
});
