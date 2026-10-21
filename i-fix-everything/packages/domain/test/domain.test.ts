import { describe, expect, it } from 'vitest';
import { EMPTY_SYMPTOMS, MachineIdentity } from '@ife/contracts';
import {
  BRAND,
  calendarMonthUtc,
  canCreateMachine,
  caseReadiness,
  convertForDisplay,
  deriveIntakeStatus,
  diffIdentity,
  effectiveCaseCapabilities,
  emptyIdentity,
  evaluateSafety,
  identityCompleteness,
  isSafeExternalUrl,
  isStale,
  PLANS,
  PRO_VALUE_PROPOSITION,
  resolveEntitlement,
  riskQuestionsFor,
  safeRedirectPath,
  screenText,
  stableStringify,
  startQuestion,
  userField,
} from '../src';

const intake = (concern = '', risk = {}) => ({ symptoms: { ...EMPTY_SYMPTOMS, concern }, risk });

describe('machine identity', () => {
  it('allows every field to be unknown and validates against the contract', () => {
    expect(MachineIdentity.safeParse(emptyIdentity()).success).toBe(true);
  });

  it('measures completeness per category (small engines are identified by the engine label, not a VIN)', () => {
    const id = emptyIdentity();
    id.make = userField('Briggs & Stratton');
    const c = identityCompleteness('small_engine', id);
    expect(c.known).toBe(1);
    expect(c.missingKeyFields).toEqual(['Engine or motor ID']);
    expect(identityCompleteness('car', id).missingKeyFields).toContain('Year');
  });

  it('diffs ignore jsonb key order but catch real changes', () => {
    const base = { identity: emptyIdentity(), installedComponents: [], modifications: [{ id: '00000000-0000-4000-8000-000000000001', description: 'Billet flywheel', provenance: 'user_entered' as const }] };
    const reordered = { ...base, modifications: [{ provenance: 'user_entered' as const, description: 'Billet flywheel', id: '00000000-0000-4000-8000-000000000001' }] };
    expect(diffIdentity(base, reordered)).toEqual([]);
    const next = { ...base, identity: { ...base.identity, year: userField('2019') } };
    expect(diffIdentity(base, next)).toEqual(['year']);
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });

  it('never fills unknown with an invented value', () => {
    expect(userField('   ')).toMatchObject({ state: 'unknown', value: null });
  });
});

describe('safety screening (R003, intake risk)', () => {
  it('raises a hold for a "yes" answer', () => {
    const h = evaluateSafety(intake('', { fuel_leak_or_smell: 'yes' }), 'small_engine', 'gasoline_4_stroke');
    expect(h.active).toBe(true);
    expect(h.reasons[0]).toMatchObject({ code: 'fuel_leak', source: 'risk_answer' });
  });

  it('treats unknown, skipped and cannot-safely-check as unresolved — never as safe', () => {
    const h = evaluateSafety(
      intake('', { smoke_or_burning: 'unknown', battery_damage: 'skipped', exposed_wiring_or_sparks: 'cannot_safely_check' }),
      'motorcycle',
      null,
    );
    expect(h.active).toBe(false);
    expect(h.unresolvedChecks).toEqual(expect.arrayContaining(['smoke_or_burning', 'battery_damage', 'exposed_wiring_or_sparks']));
  });

  it('description wording raises a hold even when the answer says no (contradiction is not silently resolved)', () => {
    const h = evaluateSafety(intake('My e-bike battery is swollen and hot', { battery_damage: 'no' }), 'motorized_bicycle', 'electric');
    expect(h.reasons.map((r) => r.code)).toContain('battery_damage');
    expect(h.reasons.find((r) => r.code === 'battery_damage')!.specialistRecommended).toBe(true);
  });

  it.each([
    ['There is gas leaking under the tank', 'fuel_leak'],
    ['white smoke and a burning smell from the wiring', 'smoke_or_fire'],
    ['the brakes are not working at all', 'brakes_or_steering'],
    ['I saw sparks near the starter', 'electrical_hazard'],
  ])('text "%s" → %s', (text, code) => {
    expect(screenText(text)).toContain(code);
  });

  it('does not raise holds for ordinary descriptions', () => {
    expect(screenText('Engine cranks but will not start after winter storage')).toEqual([]);
  });

  it('asks only relevant questions (no fuel questions for electric machines)', () => {
    const ids = riskQuestionsFor('motorized_bicycle', 'electric').map((q) => q.id);
    expect(ids).not.toContain('fuel_leak_or_smell');
    expect(ids).toContain('battery_damage');
    expect(riskQuestionsFor('small_engine', 'gasoline_2_stroke').map((q) => q.id)).not.toContain('brakes_or_steering');
  });

  it('adapts the start question to the power type', () => {
    expect(startQuestion('electric').prompt).toMatch(/turn it on/);
    expect(startQuestion('gasoline_4_stroke').prompt).toBe('What happens when you try to start it?');
  });

  it('a safety hold blocks assessment and guides regardless of plan or switches (R003, B14)', () => {
    const hold = evaluateSafety(intake('', { smoke_or_burning: 'yes' }), 'car', null);
    const caps = effectiveCaseCapabilities({ assessment: true, parts: true, videos: true, guides: true }, hold);
    expect(caps.assessment.available).toBe(false);
    expect(caps.guide.reason).toBe('safety_hold');
  });

  it('unbuilt capabilities say so honestly', () => {
    const caps = effectiveCaseCapabilities({ assessment: false, parts: false, videos: false, guides: false }, evaluateSafety(intake(), 'car', null));
    expect(caps.assessment).toMatchObject({ available: false, reason: 'not_built' });
  });
});

describe('case readiness and status', () => {
  it('reports what is missing without blocking the draft', () => {
    const r = caseReadiness({
      intake: intake('short'),
      category: 'go_kart',
      power: 'gasoline_4_stroke',
      evidence: [{ status: 'processing' }],
      identityMissingKeyFields: ['Engine or motor ID'],
      machineRevisionStale: true,
    });
    const byKey = Object.fromEntries(r.map((i) => [i.key, i.ok]));
    expect(byKey).toMatchObject({ concern: false, photos: false, photos_processing: false, risk_checks: false, identity: false, machine_revision: false });
  });

  it('derives awaiting_media only while uploads are in flight, and never touches later states', () => {
    expect(deriveIntakeStatus('draft', [{ status: 'pending_upload' }])).toBe('awaiting_media');
    expect(deriveIntakeStatus('awaiting_media', [{ status: 'ready' }, { status: 'rejected' }])).toBe('draft');
    expect(deriveIntakeStatus('resolved', [{ status: 'processing' }])).toBe('resolved');
  });
});

describe('plans and entitlements (B01, B09, B15)', () => {
  const now = new Date('2026-10-21T12:00:00Z');

  it('defaults to Free without server records — a client flag cannot grant Pro', () => {
    expect(resolveEntitlement([], now).tier).toBe('free');
  });

  it('honours only active, unrevoked Pro records', () => {
    const base = { tier: 'pro' as const, source: 'admin_grant' as const, validFrom: new Date('2026-10-01Z'), periodStart: null, periodEnd: null };
    expect(resolveEntitlement([{ ...base, validUntil: new Date('2026-11-01Z'), revokedAt: null }], now).tier).toBe('pro');
    expect(resolveEntitlement([{ ...base, validUntil: new Date('2026-10-20Z'), revokedAt: null }], now).tier).toBe('free');
    expect(resolveEntitlement([{ ...base, validUntil: null, revokedAt: new Date('2026-10-15Z') }], now).tier).toBe('free');
  });

  it('uses UTC calendar months for Free usage windows', () => {
    const w = calendarMonthUtc(new Date('2026-12-31T23:59:59Z'));
    expect(w.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(w.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('keeps the approved Pro price and provisional quotas in one config', () => {
    expect(PLANS.pro.priceUsdMonthly).toBe(14.99);
    expect(PLANS.pro.quotasProvisional).toBe(true);
    expect(canCreateMachine('free', 1)).toBe(false);
    expect(canCreateMachine('pro', 9)).toBe(true);
  });

  it('never describes finite allocations as unlimited or guaranteed', () => {
    expect(PRO_VALUE_PROPOSITION).not.toMatch(/unlimited|infinite|no limits|guarantee/i);
    expect(BRAND.productName).toBe('I Fix Everything');
  });
});

describe('units, URLs and revisions', () => {
  it('converts for display while preserving the original value and unit', () => {
    expect(convertForDisplay(25, 'N·m', 'us_customary')).toEqual({ original: { value: 25, unit: 'N·m' }, display: { value: 18.4, unit: 'lbf·ft' } });
    expect(convertForDisplay(212, '°F', 'metric').display).toEqual({ value: 100, unit: '°C' });
    expect(convertForDisplay(100, '°C', 'us_customary').display).toEqual({ value: 212, unit: '°F' });
    expect(convertForDisplay(30, 'psi', 'metric').display).toEqual({ value: 206.8, unit: 'kPa' });
    expect(convertForDisplay(3, 'widgets', 'metric').display).toBeNull();
  });

  it('only allows public https links (R005)', () => {
    expect(isSafeExternalUrl('https://www.example.com/part/123')).toBe(true);
    for (const bad of ['http://example.com', 'https://user:pw@example.com', 'https://127.0.0.1/x', 'https://localhost/x', 'javascript:alert(1)', 'https://metadata.google.internal/']) {
      expect(isSafeExternalUrl(bad)).toBe(false);
    }
  });

  it('guards post-auth redirects against open redirects', () => {
    expect(safeRedirectPath('/app/cases/1')).toBe('/app/cases/1');
    expect(safeRedirectPath('//evil.com')).toBe('/app');
    expect(safeRedirectPath('https://evil.com')).toBe('/app');
    expect(safeRedirectPath('/\\evil.com')).toBe('/app');
  });

  it('marks outputs stale when the input revision moved on (R007)', () => {
    expect(isStale(3, 3)).toBe(false);
    expect(isStale(3, 4)).toBe(true);
  });
});
