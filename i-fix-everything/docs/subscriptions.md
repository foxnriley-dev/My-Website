# Subscriptions (Free and I Fix Everything Pro)

## Status
- **Price:** USD 14.99/month for Pro — owner-approved starting price. Not a profitability claim.
- **Allowances:** proposed prototype settings, **not approved**; to be measured (Milestone 3–5) before approval.
- **Billing:** not implemented beyond schemas and server entitlement policy. Feature switch `billing` = off.
  Sandbox web checkout (Stripe test mode) and store purchases (StoreKit / Play Billing, or an evaluated purchase
  abstraction) are Milestone 5. No live charges without explicit launch approval.

## Plan configuration (`packages/domain/src/plans.ts`, `app.plan_versions`)
| Capability | Free | Pro |
|---|---|---|
| Price | Free | USD 14.99 / month (approved) |
| Standard assessment runs / period | 3 (proposed) | 100 (proposed) |
| Deep Diagnostic runs / period | 0 | 20 (proposed) |
| Images per run | 3 | 8 |
| Active saved machines | 1 (proposed, **enforced now**) | 10 (proposed) |
| Usage period | Calendar month, UTC (local-time reset shown) | Verified subscription period |
| Safety info, incidents, export, deletion | Always | Always |

Copy rule: Pro is "Deeper troubleshooting and higher limits" — never "unlimited", "infinite" or "guaranteed" (tested).

## Usage semantics (schema ready; metering starts with assessments in M3)
- One user-triggered successful analysis of a case revision = one unit, regardless of internal model calls.
- Identity/unusable-photo clarification does not consume the monthly allowance (rate/spend limits still apply).
- Failures, automatic retries, duplicate delivery and reopening results consume nothing.
- `app.usage_windows` has `CHECK (used + reserved <= unit_limit)`, so concurrent requests cannot overspend the last unit;
  `app.usage_reservations` is unique per `(user, idempotency_key)`; `app.usage_events` is unique per reservation.

## Lifecycle (to implement in M5)
Provider events → `app.purchase_events` (unique per provider event id; signature verified; payload hash only) →
reconcile against authoritative provider state → `app.subscriptions` (`last_event_at` for out-of-order delivery) →
`app.entitlements`. Client receipts or flags never grant Pro. Downgrade keeps all machines/history; creation is blocked
above the Free limit.

## B01–B15
| ID | Status | Evidence |
|---|---|---|
| B01 client flag cannot grant Pro | ✅ | integration: spoofed `tier`/`plan` fields ignored; domain `resolveEntitlement` |
| B02 last unit race | Schema constraint in place | Test with M3 metering |
| B03 duplicate provider events | Schema unique key | M5 |
| B04 failed inference releases reservation | — | M3 |
| B05 identity clarification free | — | M3 |
| B06 sandbox purchase grants Pro everywhere | — | M5 |
| B07 no duplicate subscription offer | — | M5 |
| B08 cancellation/expiry/refund/revocation/grace | — | M5 (domain resolves expired/revoked → Free ✅) |
| B09 downgrade retains machines | ✅ | limit blocks creation only; nothing deleted |
| B10 unavailable Deep consumes nothing | — | M5 |
| B11 Free at limit keeps saved work, safety, export, deletion | Partial | export/deletion/safety never metered |
| B12 period boundaries | Partial | domain UTC month boundaries tested |
| B13 checkout shows provider price | — | M5 |
| B14 safety/source invalidation identical across tiers | ✅ (safety) | domain capability test |
| B15 no "unlimited" wording | ✅ | domain copy test |

## Cost assumptions
Not yet measurable: no inference calls exist. Before proposing final allowances, measure Standard and Deep median
and tail costs, then model payment processing, store fees, infrastructure, refunds and support.
