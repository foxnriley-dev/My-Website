import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClientConfig,
} from '@tanstack/react-query';
import type {
  CaseCreateInput,
  CaseIntakeUpdateInput,
  CaseUpdateInput,
  EvidenceItem,
  EvidenceUpdateInput,
  MachineCreateInput,
  MachineRevisionCreateInput,
  MachineUpdateInput,
  PreferencesUpdateInput,
  RepairCase,
} from '@ife/contracts';
import { createContext, createElement, useContext, type ReactNode } from 'react';
import { ApiError, type ApiClient } from './index';

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  return createElement(ApiContext.Provider, { value: client }, children);
}

export function useApi(): ApiClient {
  const c = useContext(ApiContext);
  if (!c) throw new Error('useApi must be used inside <ApiProvider>');
  return c;
}

export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: (count, err) => (err instanceof ApiError ? err.retryable && count < 2 : count < 2),
        ...config.defaultOptions?.queries,
      },
      mutations: { retry: false, ...config.defaultOptions?.mutations },
    },
  });
}

export const keys = {
  meta: ['meta'] as const,
  me: ['me'] as const,
  machines: (archived = false) => ['machines', { archived }] as const,
  machine: (id: string) => ['machine', id] as const,
  machineRevisions: (id: string) => ['machine', id, 'revisions'] as const,
  cases: (machineId?: string) => ['cases', { machineId: machineId ?? null }] as const,
  case: (id: string) => ['case', id] as const,
  caseRevisions: (id: string) => ['case', id, 'revisions'] as const,
  evidence: (caseId: string) => ['case', caseId, 'evidence'] as const,
};

const IN_FLIGHT = new Set(['pending_upload', 'uploaded', 'processing']);
export const hasInFlight = (items: Pick<EvidenceItem, 'status'>[] | undefined) => !!items?.some((e) => IN_FLIGHT.has(e.status));

export function useMeta() {
  const api = useApi();
  return useQuery({ queryKey: keys.meta, queryFn: api.meta, staleTime: 60_000 });
}

export function useMe(enabled = true) {
  const api = useApi();
  return useQuery({ queryKey: keys.me, queryFn: api.me, enabled });
}

export function useMachines(includeArchived = false) {
  const api = useApi();
  return useQuery({ queryKey: keys.machines(includeArchived), queryFn: () => api.machines.list(includeArchived) });
}

export function useMachine(id: string | undefined) {
  const api = useApi();
  return useQuery({ queryKey: keys.machine(id ?? ''), queryFn: () => api.machines.get(id!), enabled: !!id });
}

export function useMachineRevisions(id: string | undefined) {
  const api = useApi();
  return useQuery({ queryKey: keys.machineRevisions(id ?? ''), queryFn: () => api.machines.revisions(id!), enabled: !!id });
}

export function useCases(machineId?: string) {
  const api = useApi();
  return useQuery({ queryKey: keys.cases(machineId), queryFn: () => api.cases.list({ machineId }) });
}

/** Polls while server jobs are active; stops when idle. Clients also refetch on focus/foreground. */
export function useCase(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: keys.case(id ?? ''),
    queryFn: () => api.cases.get(id!),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.jobs.length || q.state.data?.case.status === 'awaiting_media' ? 2000 : false),
  });
}

export function useEvidence(caseId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: keys.evidence(caseId ?? ''),
    queryFn: () => api.evidence.list(caseId!),
    enabled: !!caseId,
    refetchInterval: (q) => (hasInFlight(q.state.data?.evidence) ? 2000 : false),
    // Signed preview URLs expire after 5 minutes; refresh before then.
    staleTime: 60_000,
  });
}

export function useCaseRevisions(id: string | undefined) {
  const api = useApi();
  return useQuery({ queryKey: keys.caseRevisions(id ?? ''), queryFn: () => api.cases.revisions(id!), enabled: !!id });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...ks: readonly (readonly unknown[])[]) => Promise.all(ks.map((k) => qc.invalidateQueries({ queryKey: k })));
}

export function useCreateMachine() {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: MachineCreateInput) => api.machines.create(input),
    onSuccess: () => inv(['machines'], keys.me),
  });
}

export function useUpdateMachine(id: string) {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: MachineUpdateInput) => api.machines.update(id, input),
    onSuccess: () => inv(['machines'], keys.machine(id), keys.me),
  });
}

export function useCreateMachineRevision(id: string) {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: MachineRevisionCreateInput) => api.machines.createRevision(id, input),
    onSuccess: () => inv(['machines'], keys.machine(id), keys.machineRevisions(id), ['case']),
  });
}

export function useCreateCase() {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: CaseCreateInput) => api.cases.create(input),
    onSuccess: () => inv(['cases'], ['machines']),
  });
}

function useSetCase() {
  const qc = useQueryClient();
  return (c: RepairCase) =>
    qc.setQueryData(keys.case(c.id), (old: { case: RepairCase; jobs: unknown[] } | undefined) =>
      old ? { ...old, case: c } : { case: c, jobs: [] },
    );
}

export function useSaveIntake(id: string) {
  const api = useApi();
  const setCase = useSetCase();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: CaseIntakeUpdateInput) => api.cases.saveIntake(id, input),
    onSuccess: (c) => {
      setCase(c);
      void inv(['cases']);
    },
  });
}

export function useUpdateCase(id: string) {
  const api = useApi();
  const setCase = useSetCase();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (input: CaseUpdateInput) => api.cases.update(id, input),
    onSuccess: (c) => {
      setCase(c);
      void inv(['cases']);
    },
  });
}

export function useUseLatestMachineRevision(id: string) {
  const api = useApi();
  const setCase = useSetCase();
  return useMutation({
    mutationFn: (expectedVersion: number) => api.cases.useLatestMachineRevision(id, expectedVersion),
    onSuccess: setCase,
  });
}

export function useSaveCaseRevision(id: string) {
  const api = useApi();
  const setCase = useSetCase();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (expectedVersion: number) => api.cases.saveRevision(id, expectedVersion),
    onSuccess: (r) => {
      setCase(r.case);
      void inv(keys.caseRevisions(id));
    },
  });
}

export function useDeleteCase() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cases.remove(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: keys.case(id) });
      void qc.invalidateQueries({ queryKey: ['cases'] });
      void qc.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}

export function useUpdateEvidence(caseId: string) {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EvidenceUpdateInput }) => api.evidence.update(id, input),
    onSuccess: () => inv(keys.evidence(caseId), keys.case(caseId)),
  });
}

export function useRemoveEvidence(caseId: string) {
  const api = useApi();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.evidence.remove(id),
    onSuccess: () => inv(keys.evidence(caseId), keys.case(caseId), ['cases']),
  });
}

export function useReorderEvidence(caseId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: string[]) => api.evidence.reorder(caseId, order),
    onSuccess: (r) => qc.setQueryData(keys.evidence(caseId), r),
  });
}

export function useUpdatePreferences() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PreferencesUpdateInput) => api.updatePreferences(input),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export function useDeleteAccount() {
  const api = useApi();
  return useMutation({ mutationFn: () => api.deleteAccount() });
}

export { useIntakeDraft, type DraftStorage, type SaveState } from './intake-draft';
