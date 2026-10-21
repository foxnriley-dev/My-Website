import type { ErrorCode } from '@ife/contracts';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 400,
  conflict: 409,
  rate_limited: 429,
  limit_reached: 403,
  capability_unavailable: 503,
  payload_too_large: 413,
  unsupported_media: 415,
  client_outdated: 426,
  service_unavailable: 503,
  misconfigured: 500,
  internal: 500,
};

const RETRYABLE: Partial<Record<ErrorCode, boolean>> = {
  rate_limited: true,
  service_unavailable: true,
  internal: true,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string[]> | undefined;
  readonly current: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    opts: { fieldErrors?: Record<string, string[]>; current?: unknown; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.retryable = opts.retryable ?? RETRYABLE[code] ?? false;
    this.fieldErrors = opts.fieldErrors;
    this.current = opts.current;
  }
}

export const notFound = (what = 'That item') =>
  new AppError('not_found', `${what} was not found, or you do not have access to it.`);
