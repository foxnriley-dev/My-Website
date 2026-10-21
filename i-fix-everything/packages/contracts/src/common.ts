import { z } from 'zod';

export const API_VERSION = 'v1' as const;
export const API_BASE_PATH = `/api/${API_VERSION}` as const;

/** Clients send this so the server can apply the minimum-supported-client policy. */
export const CLIENT_HEADER = 'x-ife-client';
export const REQUEST_ID_HEADER = 'x-request-id';
export const IDEMPOTENCY_HEADER = 'idempotency-key';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

export const Timestamp = z.iso.datetime({ offset: true });
export type Timestamp = z.infer<typeof Timestamp>;

export const ClientPlatform = z.enum(['web', 'ios', 'android']);
export type ClientPlatform = z.infer<typeof ClientPlatform>;

/** Stable machine-readable error codes. The message is always safe to show. */
export const ErrorCode = z.enum([
  'unauthenticated',
  'forbidden',
  'not_found',
  'validation_failed',
  'conflict',
  'rate_limited',
  'limit_reached',
  'capability_unavailable',
  'payload_too_large',
  'unsupported_media',
  'client_outdated',
  'service_unavailable',
  'misconfigured',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
    retryable: z.boolean(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    /** Present on `conflict`: the server's current copy so the client can reconcile. */
    current: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/** Shape for value + unit pairs. Never use 0 for "unknown"; use null. */
export const Measurement = z.object({
  value: z.number().nullable(),
  unit: z.string().min(1).max(16),
  provenance: z.enum(['user_entered', 'source_document', 'device_reading']),
});
export type Measurement = z.infer<typeof Measurement>;
