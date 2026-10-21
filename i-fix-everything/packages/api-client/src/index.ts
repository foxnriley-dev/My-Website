import {
  API_BASE_PATH,
  ApiErrorBody,
  CaseList,
  CaseRevision,
  CaseRevisionList,
  CaseWithJobs,
  CLIENT_HEADER,
  CompleteUploadResult,
  DeletionResult,
  EvidenceItem,
  EvidenceList,
  Job,
  JobList,
  Machine,
  MachineList,
  MachineRevision,
  MachineRevisionList,
  Me,
  Meta,
  RepairCase,
  REQUEST_ID_HEADER,
  UploadSession,
  type CaseCreateInput,
  type CaseIntakeUpdateInput,
  type CaseUpdateInput,
  type ClientPlatform,
  type ErrorCode,
  type EvidenceRole,
  type EvidenceUpdateInput,
  type MachineCreateInput,
  type MachineRevisionCreateInput,
  type MachineUpdateInput,
  type PreferencesUpdateInput,
} from '@ife/contracts';
import { z } from 'zod';

export * from './upload';

/** A server-reported error with a stable code and a message that is safe to show. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string[]> | undefined;
  /** On `conflict`, the server's current copy for reconciliation. */
  readonly current: unknown;
  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
    this.retryable = body.retryable;
    this.fieldErrors = body.fieldErrors;
    this.current = body.current;
  }
}

/** The request never reached the server (offline, DNS, timeout). Always retryable. */
export class NetworkError extends Error {
  readonly retryable = true;
  constructor(cause?: unknown) {
    super('You appear to be offline or the server could not be reached. Your changes on this device are kept.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  platform: ClientPlatform;
  appVersion: string;
  getAccessToken: () => Promise<string | null>;
  /** Called on 401 so the app can clear local state and route to sign-in. */
  onUnauthenticated?: () => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DeleteOk = z.object({ deleted: z.literal(true), objectsRemoved: z.number().optional() });
const RevisionCreated = z.object({ machine: Machine, revision: MachineRevision, changed: z.boolean() });
const CaseRevisionCreated = z.object({ case: RepairCase, revision: CaseRevision, created: z.boolean() });

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '') + API_BASE_PATH;

  async function request<T extends z.ZodType>(schema: T, method: string, path: string, body?: unknown, auth = true): Promise<z.infer<T>> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      [CLIENT_HEADER]: `${opts.platform}/${opts.appVersion}`,
      [REQUEST_ID_HEADER]: randomId(),
    };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth) {
      const token = await opts.getAccessToken();
      if (!token) {
        opts.onUnauthenticated?.();
        throw new ApiError(401, { code: 'unauthenticated', message: 'Sign in to continue.', requestId: headers[REQUEST_ID_HEADER]!, retryable: false });
      }
      headers.authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new NetworkError(err);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const parsed = ApiErrorBody.safeParse(json);
      const err = parsed.success
        ? new ApiError(res.status, parsed.data.error)
        : new ApiError(res.status, {
            code: res.status >= 500 ? 'service_unavailable' : 'internal',
            message: 'The server returned an unexpected response. Try again.',
            requestId: res.headers.get(REQUEST_ID_HEADER) ?? '',
            retryable: res.status >= 500,
          });
      if (err.code === 'unauthenticated') opts.onUnauthenticated?.();
      throw err;
    }
    return schema.parse(json);
  }

  const enc = encodeURIComponent;
  return {
    meta: () => request(Meta, 'GET', '/meta', undefined, false),
    me: () => request(Me, 'GET', '/me'),
    updatePreferences: (input: PreferencesUpdateInput) => request(Me, 'PATCH', '/me/preferences', input),
    exportData: () => request(z.record(z.string(), z.unknown()), 'GET', '/me/export'),
    deleteAccount: () => request(DeletionResult, 'POST', '/me/deletion', { confirm: 'DELETE' }),

    machines: {
      list: (includeArchived = false) => request(MachineList, 'GET', `/machines${includeArchived ? '?includeArchived=true' : ''}`),
      get: (id: string) => request(Machine, 'GET', `/machines/${enc(id)}`),
      create: (input: MachineCreateInput) => request(Machine, 'POST', '/machines', input),
      update: (id: string, input: MachineUpdateInput) => request(Machine, 'PATCH', `/machines/${enc(id)}`, input),
      revisions: (id: string) => request(MachineRevisionList, 'GET', `/machines/${enc(id)}/revisions`),
      createRevision: (id: string, input: MachineRevisionCreateInput) =>
        request(RevisionCreated, 'POST', `/machines/${enc(id)}/revisions`, input),
    },

    cases: {
      list: (opts: { machineId?: string; includeArchived?: boolean } = {}) => {
        const qs = new URLSearchParams();
        if (opts.machineId) qs.set('machineId', opts.machineId);
        if (opts.includeArchived) qs.set('includeArchived', 'true');
        const s = qs.toString();
        return request(CaseList, 'GET', `/cases${s ? `?${s}` : ''}`);
      },
      get: (id: string) => request(CaseWithJobs, 'GET', `/cases/${enc(id)}`),
      create: (input: CaseCreateInput) => request(RepairCase, 'POST', '/cases', input),
      update: (id: string, input: CaseUpdateInput) => request(RepairCase, 'PATCH', `/cases/${enc(id)}`, input),
      remove: (id: string) => request(DeleteOk, 'DELETE', `/cases/${enc(id)}`),
      saveIntake: (id: string, input: CaseIntakeUpdateInput) => request(RepairCase, 'PUT', `/cases/${enc(id)}/intake`, input),
      useLatestMachineRevision: (id: string, expectedVersion: number) =>
        request(RepairCase, 'POST', `/cases/${enc(id)}/machine-revision`, { expectedVersion }),
      revisions: (id: string) => request(CaseRevisionList, 'GET', `/cases/${enc(id)}/revisions`),
      saveRevision: (id: string, expectedVersion: number) =>
        request(CaseRevisionCreated, 'POST', `/cases/${enc(id)}/revisions`, { expectedVersion }),
      jobs: (id: string) => request(JobList, 'GET', `/cases/${enc(id)}/jobs`),
    },

    evidence: {
      list: (caseId: string) => request(EvidenceList, 'GET', `/cases/${enc(caseId)}/evidence`),
      get: (id: string) => request(EvidenceItem, 'GET', `/evidence/${enc(id)}`),
      requestUpload: (
        caseId: string,
        input: { idempotencyKey: string; role: EvidenceRole; declaredMime: string; declaredBytes: number },
      ) => request(UploadSession, 'POST', `/cases/${enc(caseId)}/evidence/uploads`, { ...input, clientPlatform: opts.platform }),
      complete: (id: string) => request(CompleteUploadResult, 'POST', `/evidence/${enc(id)}/complete`),
      update: (id: string, input: EvidenceUpdateInput) => request(EvidenceItem, 'PATCH', `/evidence/${enc(id)}`, input),
      reorder: (caseId: string, order: string[]) => request(EvidenceList, 'PUT', `/cases/${enc(caseId)}/evidence/order`, { order }),
      remove: (id: string) => request(DeleteOk, 'DELETE', `/evidence/${enc(id)}`),
    },

    jobs: {
      get: (id: string) => request(Job, 'GET', `/jobs/${enc(id)}`),
    },

    /** Direct upload to the signed storage URL (not through the API server). */
    async putToSignedUrl(url: string, headers: Record<string, string>, body: Blob | ArrayBuffer | Uint8Array, contentType: string) {
      let res: Response;
      try {
        res = await doFetch(url, { method: 'PUT', headers: { ...headers, 'content-type': contentType }, body: body as BodyInit });
      } catch (err) {
        throw new NetworkError(err);
      }
      if (!res.ok) {
        throw new ApiError(res.status, {
          code: res.status === 413 ? 'payload_too_large' : res.status >= 500 ? 'service_unavailable' : 'validation_failed',
          message: res.status === 413 ? 'This photo is too large.' : 'The upload did not finish. Try again.',
          requestId: '',
          retryable: res.status !== 413,
        });
      }
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** RFC 4122 v4 id without depending on platform crypto APIs being identical. */
export function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[(Math.random() * 4) | 8];
    else out += hex[(Math.random() * 16) | 0];
  }
  return out;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof NetworkError) return err.message;
  return 'Something went wrong. Try again.';
}
