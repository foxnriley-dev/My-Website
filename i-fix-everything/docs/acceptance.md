# Acceptance mapping

> **Reference gap:** `reference/Motor_Repair_App_Master_Blueprint.docx` was not present in the repository, so its exact
> R001–R008 wording and A01–A28 scenario definitions could not be read. R-rules below follow the eight rules listed in
> BUILD_PROMPT.md §8 in order. A-IDs are **provisional**, assigned to the scenarios listed in BUILD_PROMPT.md §17 in order;
> re-map them when the blueprint is added.

## Rules R001–R008

| Rule | Statement (from BUILD_PROMPT §8) | Enforced now by | Tests | Status |
|---|---|---|---|---|
| R001 | Critical mechanical claims need applicable evidence or remain unverified | `specifications.verification_status`, `approved_tasks` CHECK (no approval without review), assessment contract with `source_refs` | — | Schema only; enforcement M3/M4 |
| R002 | Exact fitment requires relevant fields | `fitment_assertions` CHECK (`source_supported` needs sources), identity completeness per category | domain completeness tests | Schema + identity only; M4 |
| R003 | Safety holds override workflow and entitlements | `evaluateSafety`, server-derived capabilities, hold stored per case | domain safety tests; integration hold tests | **Enforced for intake** |
| R004 | Missing specs stay unknown and block dependent steps | `specifications.value` nullable, no zero-for-unknown; Measurement contract | — | Schema only; M4 |
| R005 | URLs only from retrieved records or labeled search routes | `isSafeExternalUrl`; `merchant_offers.url` must be https | domain URL tests | Helper only; M4 |
| R006 | Purchases, sharing, bookings, messages need deliberate user action | No automated outbound actions exist; export share sheet only on tap | — | **Holds by construction** |
| R007 | New evidence creates revisions and invalidates dependent outputs | machine revisions, case `input_revision`, stale flags, `isStale` | integration revision tests; domain | **Enforced for M1–M2 data** |
| R008 | Unsupported machines/tasks get limited guidance or handoff | Capabilities report `not_built`; `EXCLUDED_TASK_PATTERNS` defined | domain capability tests | Partial; M3/M4 |

## Scenarios (provisional A-IDs)

| ID | Scenario | Milestone | Test(s) | Status |
|---|---|---|---|---|
| A01 | Blurry identity | M3 | — | Not started (identity unknowns accepted ✅) |
| A02 | Incompatible lookalikes | M4 | — | Not started |
| A03 | Modified engines | M1 | integration: engine swap revision | ✅ data model |
| A04 | Missing critical specifications | M4 | — | Not started |
| A05 | Unsafe battery reports | M2 | domain: swollen battery text + answer contradiction | ✅ hold raised |
| A06 | New hazards during a guide | M4 | — | Not started (re-screening on every update ✅) |
| A07 | Absent and metadata-only videos | M4 | — | Not started |
| A08 | Stale prices | M4 | — | Not started |
| A09 | Skipped checks | M2 | contracts + domain: skipped ≠ no; unresolved list | ✅ intake |
| A10 | Failed repairs | M4 | — | Not started |
| A11 | Conflicting sources | M4 | — | Not started |
| A12 | Prompt injection | M3 | — | Not started |
| A13 | Cross-account access | M1 | integration `auth-and-isolation` (16 checks) | ✅ |
| A14 | Duplicate jobs | M2 | integration: duplicate `complete` → same job; idempotent creates | ✅ |
| A15 | Stale job results | M2/M3 | integration: job for removed evidence cancelled | ✅ media; assessments M3 |
| A16 | Outages | M2 | storage/queue errors map to retryable `service_unavailable`; offline UI | Partial (no fault-injection test yet) |
| A17 | Partial uploads | M2 | integration: complete-before-upload retryable; abandoned sweep; jest: resume | ✅ |
| A18 | Camera denial | M2 | jest (native fallback); web picker always available | ✅ (not on device) |
| A19 | Unsupported machines | M1–M3 | `other` category accepted; capabilities honest | Partial |
| A20 | Unit conversions | M1 | domain unit tests (original preserved) | ✅ helper |
| A21 | Revoked sources | M4 | `sources.revoked_at` | Schema only |
| A22 | Deletion | M1–M2 | integration: case delete removes objects; account delete removes rows/login | ✅ |
| A23 | Billing replay (when enabled) | M5 | `purchase_events` unique (provider, event id) | Schema only |
| A24 | Non-paywalled safety | M2 | domain: hold blocks regardless of plan; safety/export/deletion free | ✅ |
| A25 | Keyboard access | M1 | Playwright skip link + focus | ✅ (partial coverage) |
| A26 | Wrong model sources | M3/M4 | — | Not started |
| A27 | Revision invalidation | M1–M2 | integration: stale case after machine revision; repin bumps input revision | ✅ |
| A28 | Invalid media | M2 | worker unit + integration + Playwright | ✅ |

## Subscription tests B01–B15
See [subscriptions.md](subscriptions.md). B01 and B09 are covered now; the rest arrive with Milestone 5.

## Validation honesty
Passing synthetic tests are not mechanical validation. Qualified reviewers and a representative held-out evaluation
set are launch gates the coding agent cannot self-certify.
