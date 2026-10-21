import { z } from 'zod';
import { ClientPlatform, Id, Timestamp } from './common';

/** Configurable product limits (server is authoritative; clients mirror for early feedback). */
export const MEDIA_LIMITS = {
  maxImagesPerCase: 8,
  maxBytes: 15 * 1024 * 1024,
  /** Decoded pixel ceiling guards against decompression bombs. */
  maxPixels: 50_000_000,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const,
  signedUrlSeconds: 300,
  uploadUrlSeconds: 7200,
} as const;

export const AcceptedMime = z.enum(MEDIA_LIMITS.acceptedMimeTypes);
export type AcceptedMime = z.infer<typeof AcceptedMime>;

export const EvidenceRole = z.enum(['overview', 'concern_closeup', 'label', 'other']);
export type EvidenceRole = z.infer<typeof EvidenceRole>;

export const EVIDENCE_ROLE_LABELS: Record<EvidenceRole, string> = {
  overview: 'Whole machine',
  concern_closeup: 'Close-up of the problem',
  label: 'Label or tag',
  other: 'Other photo',
};

export const EvidenceStatus = z.enum([
  'pending_upload',
  'uploaded',
  'processing',
  'ready',
  'rejected',
  'failed',
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

export const RejectionReason = z.enum([
  'unsupported_type',
  'too_large',
  'too_many_pixels',
  'corrupt_or_unreadable',
  'missing_upload',
  'limit_reached',
]);
export type RejectionReason = z.infer<typeof RejectionReason>;

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  unsupported_type: 'This file is not a supported photo. Use JPEG, PNG, WebP or HEIC.',
  too_large: 'This photo is larger than 15 MB. Try a smaller photo or a screenshot.',
  too_many_pixels: 'This image has too many pixels to process safely.',
  corrupt_or_unreadable: 'We could not read this photo. It may be damaged — try taking it again.',
  missing_upload: 'The upload did not arrive. Try again.',
  limit_reached: 'This case already has the maximum number of photos.',
};

export const UploadRequestInput = z.object({
  idempotencyKey: Id,
  role: EvidenceRole,
  declaredMime: z.string().max(100),
  declaredBytes: z.number().int().positive(),
  clientPlatform: ClientPlatform,
});
export type UploadRequestInput = z.infer<typeof UploadRequestInput>;

export const EvidenceUpdateInput = z.object({
  role: EvidenceRole.optional(),
  caption: z.string().trim().max(500).nullable().optional(),
});
export type EvidenceUpdateInput = z.infer<typeof EvidenceUpdateInput>;

/** Photo order is presentation-only, so last write wins (no version token). */
export const EvidenceOrderInput = z.object({
  order: z.array(Id).max(50),
});
export type EvidenceOrderInput = z.infer<typeof EvidenceOrderInput>;

export const SignedImage = z.object({
  url: z.url(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});

export const EvidenceItem = z.object({
  id: Id,
  caseId: Id,
  role: EvidenceRole,
  sortOrder: z.number().int(),
  status: EvidenceStatus,
  rejectionReason: RejectionReason.nullable(),
  caption: z.string().nullable(),
  bytes: z.number().int().nullable(),
  detectedMime: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  createdAt: Timestamp,
  processedAt: Timestamp.nullable(),
  preview: SignedImage.nullable(),
  thumb: SignedImage.nullable(),
  urlsExpireAt: Timestamp.nullable(),
});
export type EvidenceItem = z.infer<typeof EvidenceItem>;

export const UploadSession = z.object({
  evidence: EvidenceItem,
  upload: z
    .object({
      url: z.url(),
      method: z.literal('PUT'),
      headers: z.record(z.string(), z.string()),
      expiresAt: Timestamp,
    })
    .nullable(),
});
export type UploadSession = z.infer<typeof UploadSession>;
