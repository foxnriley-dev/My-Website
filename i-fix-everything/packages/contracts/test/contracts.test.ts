import { describe, expect, it } from 'vitest';
import { ApiErrorBody, AssessmentPayload, CaseIntakeUpdateInput, EMPTY_SYMPTOMS, IdentityField, UploadRequestInput } from '../src';

describe('contracts', () => {
  it('rejects a known identity field without provenance', () => {
    expect(IdentityField.safeParse({ state: 'known', value: 'Honda', provenance: null, confirmation: 'confirmed' }).success).toBe(false);
  });
  it('rejects an unknown field carrying a value', () => {
    expect(IdentityField.safeParse({ state: 'unknown', value: '2004', provenance: null, confirmation: 'confirmed' }).success).toBe(false);
  });
  it('keeps "unknown", "skipped" and "cannot safely check" distinct from "no"', () => {
    const parsed = CaseIntakeUpdateInput.parse({ expectedVersion: 0, symptoms: EMPTY_SYMPTOMS, risk: { fuel_leak_or_smell: 'cannot_safely_check', smoke_or_burning: 'skipped' } });
    expect(parsed.risk.fuel_leak_or_smell).toBe('cannot_safely_check');
  });
  it('requires a client platform and positive size for uploads', () => {
    expect(UploadRequestInput.safeParse({ idempotencyKey: crypto.randomUUID(), role: 'label', declaredMime: 'image/jpeg', declaredBytes: 0, clientPlatform: 'ios' }).success).toBe(false);
  });
  it('error envelope carries request id and retryability', () => {
    expect(ApiErrorBody.safeParse({ error: { code: 'conflict', message: 'x', requestId: 'r', retryable: false } }).success).toBe(true);
  });
  it('assessment payload rejects unknown schema versions', () => {
    expect(AssessmentPayload.safeParse({ schema_version: '1999' }).success).toBe(false);
  });
});
