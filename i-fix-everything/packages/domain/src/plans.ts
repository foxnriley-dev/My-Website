import type { EntitlementSummary, PlanTier } from '@ife/contracts';

/**
 * Versioned plan configuration. The USD 14.99/month Pro price is owner-approved.
 * Allowances are PROPOSED prototype settings pending cost measurement — they are
 * not market research or profitability forecasts. Do not scatter these in UI code.
 */
export interface PlanLimits {
  savedMachines: number;
  standardRunsPerPeriod: number;
  deepRunsPerPeriod: number;
  imagesPerRun: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  displayName: string;
  /** Owner-approved list price for Pro; checkout must still show the provider-localized price. */
  priceUsdMonthly: number | null;
  priceApproved: boolean;
  limits: PlanLimits;
  quotasProvisional: boolean;
  periodRule: 'calendar_month_utc' | 'subscription_period';
}

export const PLAN_CONFIG_VERSION = '2026-10-v1';

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    displayName: 'Free',
    priceUsdMonthly: null,
    priceApproved: true,
    limits: { savedMachines: 1, standardRunsPerPeriod: 3, deepRunsPerPeriod: 0, imagesPerRun: 3 },
    quotasProvisional: true,
    periodRule: 'calendar_month_utc',
  },
  pro: {
    tier: 'pro',
    displayName: 'I Fix Everything Pro',
    priceUsdMonthly: 14.99,
    priceApproved: true,
    limits: { savedMachines: 10, standardRunsPerPeriod: 100, deepRunsPerPeriod: 20, imagesPerRun: 8 },
    quotasProvisional: true,
    periodRule: 'subscription_period',
  },
};

/** Honest upgrade copy. Never "unlimited", never "guaranteed". (B15) */
export const PRO_VALUE_PROPOSITION = 'Deeper troubleshooting and higher limits';

/** Calendar month in UTC for Free usage windows. */
export function calendarMonthUtc(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export interface EntitlementRecord {
  tier: PlanTier;
  source: EntitlementSummary['source'];
  validFrom: Date;
  validUntil: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  revokedAt: Date | null;
}

/**
 * Resolve the effective entitlement from server records only. A client flag can
 * never grant Pro (B01). Expired or revoked records fall back to Free.
 */
export function resolveEntitlement(
  records: EntitlementRecord[],
  now: Date,
): { tier: PlanTier; record: EntitlementRecord | null } {
  const active = records
    .filter((r) => !r.revokedAt && r.validFrom <= now && (r.validUntil === null || r.validUntil > now))
    .sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'pro' ? -1 : 1));
  const best = active[0];
  return best ? { tier: best.tier, record: best } : { tier: 'free', record: null };
}

export function usageWindow(
  tier: PlanTier,
  record: EntitlementRecord | null,
  now: Date,
): { start: Date; end: Date } {
  if (tier === 'pro' && record?.periodStart && record.periodEnd) {
    return { start: record.periodStart, end: record.periodEnd };
  }
  return calendarMonthUtc(now);
}

export function canCreateMachine(tier: PlanTier, activeMachineCount: number): boolean {
  return activeMachineCount < PLANS[tier].limits.savedMachines;
}
