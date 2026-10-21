import { runUpload, type ApiClient, type UploadManifestEntry } from '@ife/api-client';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ uri, exists: uri.includes('present'), size: 10, delete: jest.fn(), bytes: async () => new Uint8Array([1]), upload: jest.fn(async () => ({ status: 200, body: '', headers: {} })) })),
  Directory: jest.fn(),
  Paths: { document: {} },
  UploadType: { BINARY_CONTENT: 0 },
}));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-image-picker', () => ({}));

import { loadManifest, resumePending, saveEntry } from '@/lib/uploads';

const evidence = (status: string) => ({
  id: '00000000-0000-4000-8000-000000000001',
  caseId: '00000000-0000-4000-8000-0000000000aa',
  role: 'overview',
  sortOrder: 0,
  status,
  rejectionReason: null,
  caption: null,
  bytes: null,
  detectedMime: null,
  width: null,
  height: null,
  createdAt: new Date().toISOString(),
  processedAt: null,
  preview: null,
  thumb: null,
  urlsExpireAt: null,
});

function fakeApi(serverStatus: 'pending_upload' | 'uploaded') {
  const calls: string[] = [];
  const api = {
    evidence: {
      requestUpload: jest.fn(async () => {
        calls.push('request');
        return { evidence: evidence(serverStatus), upload: serverStatus === 'pending_upload' ? { url: 'https://storage.test/put', method: 'PUT', headers: {}, expiresAt: new Date().toISOString() } : null };
      }),
      complete: jest.fn(async () => {
        calls.push('complete');
        return { evidence: evidence('uploaded'), job: null };
      }),
    },
    putToSignedUrl: jest.fn(async () => {
      calls.push('put');
    }),
  } as unknown as ApiClient;
  return { api, calls };
}

const entry = (over: Partial<UploadManifestEntry> = {}): UploadManifestEntry => ({
  localId: 'L1',
  idempotencyKey: '00000000-0000-4000-8000-0000000000bb',
  caseId: '00000000-0000-4000-8000-0000000000aa',
  role: 'overview',
  mime: 'image/jpeg',
  bytes: 10,
  localUri: 'file:///present.jpg',
  state: 'uploading',
  updatedAt: new Date().toISOString(),
  ...over,
});

test('after a restart, a file the server already received is not sent again', async () => {
  const { api, calls } = fakeApi('uploaded');
  await saveEntry('u1', entry());
  await resumePending(api, 'u1', () => {});
  expect(calls).toEqual(['request', 'complete']);
  expect(await loadManifest('u1')).toEqual([]);
});

test('if the local copy is gone, the user is asked to select the photo again', async () => {
  const { api, calls } = fakeApi('pending_upload');
  const states: string[] = [];
  const result = await runUpload(api, entry({ localUri: 'file:///missing.jpg' }), null, (e) => states.push(e.state));
  expect(result).toBeNull();
  expect(states.at(-1)).toBe('needs_reselect');
  expect(calls).toEqual(['request']);
});

test('a failed file keeps its idempotency key so retry resumes the same server item', async () => {
  const { api } = fakeApi('pending_upload');
  (api.evidence.complete as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const seen: UploadManifestEntry[] = [];
  await runUpload(api, entry(), { mime: 'image/jpeg', bytes: 10, read: async () => new Uint8Array([1]) }, (e) => seen.push(e));
  expect(seen.at(-1)?.state).toBe('failed');
  await runUpload(api, seen.at(-1)!, { mime: 'image/jpeg', bytes: 10, read: async () => new Uint8Array([1]) }, (e) => seen.push(e));
  expect(seen.at(-1)?.state).toBe('done');
  const keys = (api.evidence.requestUpload as jest.Mock).mock.calls.map((c) => c[1].idempotencyKey);
  expect(new Set(keys).size).toBe(1);
});
