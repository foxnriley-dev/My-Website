import { ApiError, type ApiClient } from '@ife/api-client';
import { ApiProvider, createQueryClient, useIntakeDraft } from '@ife/api-client/react';
import { EMPTY_SYMPTOMS, type RepairCase } from '@ife/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const mockSignIn = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: () => ({ auth: { signInWithPassword: mockSignIn, getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } }),
}));
const mockTakePhoto = jest.fn();
const mockChoosePhotos = jest.fn();
jest.mock('@/lib/photos', () => ({ takePhoto: (...a: unknown[]) => mockTakePhoto(...a), choosePhotos: (...a: unknown[]) => mockChoosePhotos(...a), localFile: () => null, deleteLocalCopies: () => {} }));
jest.mock('@/lib/session', () => ({ useSession: () => ({ status: 'signedIn', userId: 'u1', email: 'a@b.c', signOut: async () => {} }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Directory: jest.fn(), Paths: {}, UploadType: { BINARY_CONTENT: 0 } }));

import { Choice } from '@/components/ui';
import { PhotoManager } from '@/components/photo-manager';
import SignIn from '@/app/(auth)/sign-in';
import { nativeDraftStorage } from '@/lib/drafts';

function wrap(api: Partial<ApiClient>) {
  const qc = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ApiProvider client={api as ApiClient}>{children}</ApiProvider>
    </QueryClientProvider>
  );
}

test('sign in shows a friendly message for wrong credentials', async () => {
  mockSignIn.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });
  await render(<SignIn />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('That email and password do not match an account.')).toBeTruthy();
});

test('camera permission denial offers the photo library instead', async () => {
  mockTakePhoto.mockResolvedValueOnce({ status: 'camera_denied', canAskAgain: false });
  mockChoosePhotos.mockResolvedValueOnce({ status: 'cancelled' });
  const api = { evidence: { list: async () => ({ evidence: [] }) } } as unknown as ApiClient;
  await render(<PhotoManager caseId="00000000-0000-4000-8000-0000000000aa" />, { wrapper: wrap(api) });
  await fireEvent.press(screen.getByRole('button', { name: 'Take a photo' }));
  expect(await screen.findByText('Camera access is off')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Choose from library instead' }));
  expect(mockChoosePhotos).toHaveBeenCalled();
});

test('choice rows expose radio role and checked state to screen readers', async () => {
  await render(<Choice legend="Units" options={[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]} value="b" onChange={() => {}} />);
  expect(screen.getByRole('radio', { name: 'Beta' }).props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByRole('radio', { name: 'Alpha' }).props.accessibilityState).toEqual({ checked: false });
});

const kase = (over: Partial<RepairCase> = {}): RepairCase => ({
  id: '00000000-0000-4000-8000-0000000000aa',
  machineId: '00000000-0000-4000-8000-0000000000bb',
  machineNickname: 'Kart',
  machineCategory: 'go_kart',
  machinePowerType: null,
  machineRevisionId: '00000000-0000-4000-8000-0000000000cc',
  machineRevisionNumber: 1,
  machineRevisionStale: false,
  title: 'New repair',
  status: 'draft',
  safetyHold: { active: false, reasons: [], unresolvedChecks: [] },
  inputRevision: 0,
  version: 0,
  intake: { symptoms: EMPTY_SYMPTOMS, risk: {} },
  intakeUpdatedAt: new Date().toISOString(),
  lastSavedRevision: null,
  readiness: [],
  capabilities: {
    assessment: { available: false, reason: 'not_built', message: '' },
    parts: { available: false, reason: 'not_built', message: '' },
    videos: { available: false, reason: 'not_built', message: '' },
    guide: { available: false, reason: 'not_built', message: '' },
  },
  evidenceCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  ...over,
});

test('a save that loses to another device becomes a conflict, keeps typed text, and "keep mine" re-saves', async () => {
  const server = kase({ version: 1, intake: { symptoms: { ...EMPTY_SYMPTOMS, concern: 'from the website' }, risk: {} } });
  const saveIntake = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(409, { code: 'conflict', message: 'changed', requestId: 'r', retryable: false, current: server }))
    .mockImplementationOnce(async (_id: string, input: { expectedVersion: number; symptoms: { concern: string } }) =>
      kase({ version: input.expectedVersion + 1, intake: { symptoms: { ...EMPTY_SYMPTOMS, concern: input.symptoms.concern }, risk: {} } }),
    );
  const api = { cases: { saveIntake } } as unknown as ApiClient;
  const { result } = await renderHook(() => useIntakeDraft(nativeDraftStorage, 'u1', kase(), 10), { wrapper: wrap(api) });
  await waitFor(() => expect(result.current.loaded).toBe(true));

  await act(async () => result.current.setValue({ symptoms: { ...EMPTY_SYMPTOMS, concern: 'from the phone' }, risk: {} }));
  await waitFor(() => expect(result.current.state.kind).toBe('conflict'));
  expect(result.current.value.symptoms.concern).toBe('from the phone');

  await act(async () => result.current.resolve('mine'));
  await waitFor(() => expect(result.current.state.kind).toBe('saved'));
  expect(saveIntake).toHaveBeenLastCalledWith(server.id, expect.objectContaining({ expectedVersion: 1 }));
  expect(result.current.value.symptoms.concern).toBe('from the phone');
});
