import {
  API_BASE_PATH,
  AccountDeletionInput,
  CaseCreateInput,
  CaseIntakeUpdateInput,
  CaseUpdateInput,
  CaseVersionInput,
  CLIENT_HEADER,
  ClientPlatform,
  EvidenceOrderInput,
  EvidenceUpdateInput,
  MachineCreateInput,
  MachineRevisionCreateInput,
  MachineUpdateInput,
  PreferencesUpdateInput,
  REQUEST_ID_HEADER,
  UploadRequestInput,
  type ApiErrorBody,
  type Meta,
} from '@ife/contracts';
import { z, ZodError } from 'zod';
import { authenticate } from './auth';
import { withUser, type UserContext } from './db';
import { ConfigError, getEnv } from './env';
import { AppError } from './errors';
import * as account from './services/account';
import * as cases from './services/cases';
import * as evidence from './services/evidence';
import { featureSwitches } from './services/features';
import * as jobs from './services/jobs';
import * as machines from './services/machines';

const MAX_JSON_BYTES = 64 * 1024;

interface Ctx {
  req: Request;
  url: URL;
  params: Record<string, string>;
  user: UserContext;
  requestId: string;
  body: () => Promise<unknown>;
}

type Handler = (ctx: Ctx) => Promise<{ status?: number; body: unknown }>;

interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pattern: string;
  auth: boolean;
  handler: Handler;
  regex: RegExp;
  keys: string[];
}

const routes: Route[] = [];
function route(method: Route['method'], pattern: string, handler: Handler, auth = true) {
  const keys: string[] = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:([a-zA-Z]+)/g, (_m, k: string) => {
        keys.push(k);
        return '([0-9a-fA-F-]{36})';
      }) +
      '$',
  );
  routes.push({ method, pattern, auth, handler, regex, keys });
}

const parse = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> => schema.parse(data);
const q = (ctx: Ctx, name: string) => ctx.url.searchParams.get(name);
const tx = <T>(ctx: Ctx, fn: Parameters<typeof withUser<T>>[1]) => withUser<T>(ctx.user, fn);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
route(
  'GET',
  '/meta',
  async () => {
    const env = getEnv();
    const sw = await featureSwitches();
    const meta: Meta = {
      apiVersion: 'v1',
      serverTime: new Date().toISOString(),
      environment: env.APP_ENV,
      minClientVersion: { web: env.MIN_CLIENT_VERSION_WEB, ios: env.MIN_CLIENT_VERSION_IOS, android: env.MIN_CLIENT_VERSION_ANDROID },
      capabilities: {
        assessment: sw.assessment,
        deepDiagnostic: sw.deepDiagnostic,
        parts: sw.parts,
        videos: sw.videos,
        guides: sw.guides,
        billing: sw.billing,
        inviteRequired: sw.inviteRequired,
      },
      demoMode: env.DEMO_MODE,
    };
    return { body: meta };
  },
  false,
);

route('GET', '/me', async (ctx) => ({ body: await tx(ctx, (t) => account.getMe(t, ctx.user)) }));
route('PATCH', '/me/preferences', async (ctx) => {
  const input = parse(PreferencesUpdateInput, await ctx.body());
  return { body: await tx(ctx, (t) => account.updatePreferences(t, ctx.user, input, ctx.requestId)) };
});
route('GET', '/me/export', async (ctx) => ({ body: await tx(ctx, (t) => account.exportData(t, ctx.user)) }));
route('POST', '/me/deletion', async (ctx) => {
  parse(AccountDeletionInput, await ctx.body());
  const result = await account.deleteAccount(ctx.user, ctx.requestId);
  return { body: { deleted: true, objectsRemoved: result.objectsRemoved, notes: result.notes } };
});

route('GET', '/machines', async (ctx) => ({
  body: { machines: await tx(ctx, (t) => machines.listMachines(t, q(ctx, 'includeArchived') === 'true')) },
}));
route('POST', '/machines', async (ctx) => {
  const input = parse(MachineCreateInput, await ctx.body());
  const result = await tx(ctx, (t) => machines.createMachine(t, ctx.user, input, ctx.requestId));
  return { status: result.created ? 201 : 200, body: result.machine };
});
route('GET', '/machines/:id', async (ctx) => ({ body: await tx(ctx, (t) => machines.getMachine(t, ctx.params.id!)) }));
route('PATCH', '/machines/:id', async (ctx) => {
  const input = parse(MachineUpdateInput, await ctx.body());
  return { body: await tx(ctx, (t) => machines.updateMachine(t, ctx.user, ctx.params.id!, input, ctx.requestId)) };
});
route('GET', '/machines/:id/revisions', async (ctx) => ({
  body: { revisions: await tx(ctx, (t) => machines.listMachineRevisions(t, ctx.params.id!)) },
}));
route('POST', '/machines/:id/revisions', async (ctx) => {
  const input = parse(MachineRevisionCreateInput, await ctx.body());
  const result = await tx(ctx, (t) => machines.createMachineRevision(t, ctx.user, ctx.params.id!, input, ctx.requestId));
  return { status: result.changed ? 201 : 200, body: result };
});

route('GET', '/cases', async (ctx) => ({
  body: {
    cases: await tx(ctx, (t) =>
      cases.listCases(t, { machineId: q(ctx, 'machineId') ?? undefined, includeArchived: q(ctx, 'includeArchived') === 'true' }),
    ),
  },
}));
route('POST', '/cases', async (ctx) => {
  const input = parse(CaseCreateInput, await ctx.body());
  const result = await tx(ctx, (t) => cases.createCase(t, ctx.user, input, ctx.requestId));
  return { status: result.created ? 201 : 200, body: result.case };
});
route('GET', '/cases/:id', async (ctx) => ({
  body: await tx(ctx, async (t) => ({ case: await cases.getCase(t, ctx.params.id!), jobs: await jobs.listCaseJobs(t, ctx.params.id!, true) })),
}));
route('PATCH', '/cases/:id', async (ctx) => {
  const input = parse(CaseUpdateInput, await ctx.body());
  return { body: await tx(ctx, (t) => cases.updateCase(t, ctx.user, ctx.params.id!, input, ctx.requestId)) };
});
route('DELETE', '/cases/:id', async (ctx) => ({
  body: { deleted: true, ...(await tx(ctx, (t) => cases.deleteCase(t, ctx.user, ctx.params.id!, ctx.requestId))) },
}));
route('PUT', '/cases/:id/intake', async (ctx) => {
  const input = parse(CaseIntakeUpdateInput, await ctx.body());
  return { body: await tx(ctx, (t) => cases.updateIntake(t, ctx.user, ctx.params.id!, input, ctx.requestId)) };
});
route('POST', '/cases/:id/machine-revision', async (ctx) => {
  const { expectedVersion } = parse(CaseVersionInput, await ctx.body());
  return { body: await tx(ctx, (t) => cases.useLatestMachineRevision(t, ctx.user, ctx.params.id!, expectedVersion, ctx.requestId)) };
});
route('GET', '/cases/:id/revisions', async (ctx) => ({
  body: { revisions: await tx(ctx, (t) => cases.listCaseRevisions(t, ctx.params.id!)) },
}));
route('POST', '/cases/:id/revisions', async (ctx) => {
  const { expectedVersion } = parse(CaseVersionInput, await ctx.body());
  const result = await tx(ctx, (t) => cases.saveCaseRevision(t, ctx.user, ctx.params.id!, expectedVersion, ctx.requestId));
  return { status: result.created ? 201 : 200, body: result };
});
route('GET', '/cases/:id/jobs', async (ctx) => ({ body: { jobs: await tx(ctx, (t) => jobs.listCaseJobs(t, ctx.params.id!)) } }));

route('GET', '/cases/:id/evidence', async (ctx) => ({ body: { evidence: await tx(ctx, (t) => evidence.listEvidence(t, ctx.params.id!)) } }));
route('POST', '/cases/:id/evidence/uploads', async (ctx) => {
  const input = parse(UploadRequestInput, await ctx.body());
  return { status: 201, body: await tx(ctx, (t) => evidence.requestUpload(t, ctx.user, ctx.params.id!, input, ctx.requestId)) };
});
route('PUT', '/cases/:id/evidence/order', async (ctx) => {
  const input = parse(EvidenceOrderInput, await ctx.body());
  return { body: { evidence: await tx(ctx, (t) => evidence.reorderEvidence(t, ctx.user, ctx.params.id!, input.order, ctx.requestId)) } };
});
route('GET', '/evidence/:id', async (ctx) => ({ body: await tx(ctx, (t) => evidence.getEvidence(t, ctx.params.id!)) }));
route('POST', '/evidence/:id/complete', async (ctx) => ({
  body: await tx(ctx, (t) => evidence.completeUpload(t, ctx.user, ctx.params.id!, ctx.requestId)),
}));
route('PATCH', '/evidence/:id', async (ctx) => {
  const input = parse(EvidenceUpdateInput, await ctx.body());
  return { body: await tx(ctx, (t) => evidence.updateEvidence(t, ctx.user, ctx.params.id!, input, ctx.requestId)) };
});
route('DELETE', '/evidence/:id', async (ctx) => {
  await tx(ctx, (t) => evidence.removeEvidence(t, ctx.user, ctx.params.id!, ctx.requestId));
  return { body: { deleted: true } };
});
route('GET', '/jobs/:id', async (ctx) => ({ body: await tx(ctx, (t) => jobs.getJob(t, ctx.params.id!)) }));

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function checkClientVersion(header: string | null): void {
  if (!header) return;
  const [platform, version] = header.split('/');
  const parsed = ClientPlatform.safeParse(platform);
  if (!parsed.success || !version) return;
  const env = getEnv();
  const min = { web: env.MIN_CLIENT_VERSION_WEB, ios: env.MIN_CLIENT_VERSION_IOS, android: env.MIN_CLIENT_VERSION_ANDROID }[parsed.data];
  if (compareVersions(version, min) < 0) {
    throw new AppError('client_outdated', 'This version of the app is no longer supported. Update the app to continue.');
  }
}

/** Map database errors to stable API errors without leaking internals. */
function mapDbError(err: { code?: string }): AppError | null {
  switch (err.code) {
    case '23505':
      return new AppError('conflict', 'That change conflicts with an existing record.');
    case '23503': // FK violation — e.g. referencing another user's row
      return new AppError('not_found', 'A referenced item was not found, or you do not have access to it.');
    case '23514':
    case '22P02':
      return new AppError('validation_failed', 'Some of the information was not valid.');
    case '42501':
      return new AppError('forbidden', 'You do not have access to that.');
    case '40001':
    case '40P01':
      return new AppError('service_unavailable', 'The server was busy. Try again.', { retryable: true });
    default:
      return null;
  }
}

function json(status: number, body: unknown, requestId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}

function errorResponse(err: unknown, requestId: string): Response {
  let e: AppError;
  if (err instanceof AppError) e = err;
  else if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    e = new AppError('validation_failed', 'Some of the information was not valid.', { fieldErrors });
  } else if (err instanceof ConfigError) {
    console.error(JSON.stringify({ level: 'error', msg: 'config_error', requestId, err: err.message }));
    e = new AppError('misconfigured', 'The service is not configured correctly. The team has been notified.');
  } else {
    e =
      mapDbError(err as { code?: string }) ??
      new AppError('internal', 'Something went wrong on our side. Your information is safe; try again.');
    if (e.code === 'internal') {
      console.error(JSON.stringify({ level: 'error', msg: 'unhandled', requestId, err: String((err as Error)?.stack ?? err) }));
    }
  }
  const body: ApiErrorBody = {
    error: {
      code: e.code,
      message: e.message,
      requestId,
      retryable: e.retryable,
      ...(e.fieldErrors ? { fieldErrors: e.fieldErrors } : {}),
      ...(e.current !== undefined ? { current: e.current } : {}),
    },
  };
  return json(e.status, body, requestId);
}

/** Entry point for every `/api/v1/*` request from web, iOS and Android. */
export async function handleApiRequest(req: Request): Promise<Response> {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.slice(0, 64).replace(/[^\w-]/g, '') || crypto.randomUUID();
  const started = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.startsWith(API_BASE_PATH) ? url.pathname.slice(API_BASE_PATH.length) || '/' : url.pathname;
  let status = 500;
  let matched = 'unmatched';
  try {
    checkClientVersion(req.headers.get(CLIENT_HEADER));
    const candidates = routes.filter((r) => r.regex.test(path));
    const r = candidates.find((c) => c.method === req.method);
    if (!r) {
      throw candidates.length
        ? new AppError('validation_failed', 'That method is not supported here.')
        : new AppError('not_found', 'That endpoint does not exist.');
    }
    matched = r.pattern;
    const m = r.regex.exec(path)!;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]!.toLowerCase()]));
    const user = r.auth ? await authenticate(req.headers.get('authorization')) : ({ id: '', email: null, sessionId: null } as UserContext);
    const ctx: Ctx = {
      req,
      url,
      params,
      user,
      requestId,
      body: async () => {
        const text = await req.text();
        if (text.length > MAX_JSON_BYTES) throw new AppError('payload_too_large', 'That request is too large.');
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          throw new AppError('validation_failed', 'The request body was not valid JSON.');
        }
      },
    };
    const result = await r.handler(ctx);
    status = result.status ?? 200;
    return json(status, result.body, requestId);
  } catch (err) {
    const res = errorResponse(err, requestId);
    status = res.status;
    return res;
  } finally {
    // Never log bodies, tokens or query strings (they may contain user data).
    console.log(JSON.stringify({ level: 'info', msg: 'api', method: req.method, route: matched, status, ms: Date.now() - started, requestId }));
  }
}
