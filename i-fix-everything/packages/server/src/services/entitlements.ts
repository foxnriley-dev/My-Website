import type { EntitlementSummary } from '@ife/contracts';
import { PLAN_CONFIG_VERSION, PLANS, resolveEntitlement, usageWindow, type EntitlementRecord } from '@ife/domain';
import { isoReq, type Tx, one } from '../db';

interface EntRow {
  tier: 'free' | 'pro';
  source: EntitlementRecord['source'];
  validFrom: Date;
  validUntil: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  revokedAt: Date | null;
}

export async function effectiveTier(tx: Tx, userId: string, now = new Date()) {
  const rows = await tx<EntRow[]>`
    select tier, source, valid_from, valid_until, period_start, period_end, revoked_at
    from app.entitlements where user_id = ${userId}`;
  return resolveEntitlement(rows, now);
}

export async function entitlementSummary(tx: Tx, userId: string, now = new Date()): Promise<EntitlementSummary> {
  const { tier, record } = await effectiveTier(tx, userId, now);
  const plan = PLANS[tier];
  const window = usageWindow(tier, record, now);
  const usage = await tx<{ kind: 'standard' | 'deep'; used: number }[]>`
    select kind, used from app.usage_windows
    where user_id = ${userId} and period_start = ${window.start}`;
  const { count } = await one(tx<{ count: number }[]>`
    select count(*)::int as count from app.machines where user_id = ${userId} and archived_at is null`);
  const used = (k: 'standard' | 'deep') => usage.find((u) => u.kind === k)?.used ?? 0;
  return {
    tier,
    planVersion: `${tier}-${PLAN_CONFIG_VERSION}`,
    source: record?.source ?? 'default_free',
    validUntil: record?.validUntil ? isoReq(record.validUntil) : null,
    billingEnabled: false,
    limits: plan.limits,
    usage: {
      savedMachines: count,
      standardRuns: { used: used('standard'), limit: plan.limits.standardRunsPerPeriod, periodStart: isoReq(window.start), periodEnd: isoReq(window.end) },
      deepRuns: { used: used('deep'), limit: plan.limits.deepRunsPerPeriod, periodStart: isoReq(window.start), periodEnd: isoReq(window.end) },
    },
    quotasProvisional: plan.quotasProvisional,
  };
}
