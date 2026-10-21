# Build status

_Last updated: 2026-10-21 (work package 1: Milestones 1 and 2)._

## Gates

| Milestone | State | Notes |
|---|---|---|
| 1 Foundation | **Implemented; automated gates pass** except checks that need native runtimes (see below) | Web + iOS + Android clients, auth, garage, revisions, cases, schemas, RLS, storage policy, local setup |
| 2 Evidence intake | **Implemented; automated gates pass** except native runtime checks | Camera/library uploads, validation worker, private derivatives, symptoms, risk intake + holds, identity confirmation, drafts, conflicts, job status |
| 3 Real diagnostic flow | Not started | Domain boundaries, assessment payload contract and tables exist |
| 4 Resources and repair mode | Not started | Tables for parts/fitment/offers/videos/guides exist |
| 5 Operational beta + subscriptions | Not started | Plan/entitlement/usage/purchase-event schemas and policy exist |
| 6 Paid release | Not started | — |

### Milestone 1 acceptance

| Criterion | Status | Evidence |
|---|---|---|
| Two accounts cannot access each other's machines/cases | ✅ | `tests/integration/auth-and-isolation.test.ts` (9 endpoint checks + modify/create/reorder attempts) |
| Data survives refresh and sign-in | ✅ | Playwright journey (reload + new tab); integration tests use fresh requests |
| Unknown machine fields accepted | ✅ | integration + Playwright ("0 of 4 key details known") |
| Logout removes protected access | ✅ | integration (revoked session → 401 with unexpired token); Playwright; native sign-out clears secure-store drafts/manifests (jest) |
| Machine created on web appears on iOS and Android after authenticated refresh | ✅ at API/client level | `tests/integration/cross-platform.test.ts` uses the shipped client as `web`, `ios`, `android`. ⚠️ Not yet observed in a running native app |
| Sign in / sign out / recovery callbacks / session restore per platform | Web ✅ (Playwright: sign-in/out, invite sign-up → email confirmation link, password recovery link → new password → sign in; via local Mailpit) · Native ⚠️ implemented, unit-tested pieces only | No simulator/emulator in this environment |
| Loading and error states | ✅ | Every screen has loading/error/empty/unavailable states |
| No localStorage-only mock for records | ✅ | Postgres is the source of truth; local storage is drafts only |

### Milestone 2 acceptance

| Criterion | Status | Evidence |
|---|---|---|
| Invalid media rejected | ✅ | worker unit tests (text, SVG, truncated, bomb, oversize); integration (bytes vs declared type); Playwright (txt file) |
| A failed file retries independently | ✅ | integration (`completing before the file arrives…`); native jest (same idempotency key on retry) |
| Camera denial has a fallback | Web ✅ (file picker always offered) · Native ✅ in jest (`Camera access is off` → library) · ⚠️ not run on device |
| Evidence remains private | ✅ | integration: no public URL, owner JWT cannot read storage directly, derivatives served only via 5-minute signed URLs; EXIF/GPS removed from derivatives |
| Editing identity creates a revision | ✅ | integration (immutable revisions, conflicts, stale-case flag, repin) |
| Native permission denial and limited photo access | ⚠️ | Implemented (system picker needs no library permission; limited access works through it). Not run on device |
| Foreground return | ⚠️ | Implemented (React Query focus manager on AppState; upload resume on `active`). Not run on device |
| App termination recovery | ⚠️ partially | Persisted upload manifest + server-first resume tested in jest; Maestro flow `03-resume-after-kill.yaml` written, not run |
| Cross-device revision conflicts | ✅ | integration (ios vs android clients), Playwright (two browser contexts), jest (shared hook) |

## Checks run (2026-10-21, this container)
| Check | Result |
|---|---|
| ESLint (whole monorepo) | clean |
| TypeScript (8 workspaces) | 8/8 pass |
| Unit — Vitest (domain, contracts, server env guard, worker media validation) | 43/43 pass |
| Integration — Vitest against real local Supabase + pg-boss + worker handler | 49/49 pass |
| Web production build (Next 16.4.2) | success |
| Web E2E — Playwright, prebuilt Chromium, desktop + Pixel 7 emulation | 11/11 pass |
| Native unit/screen — jest-expo | 11/11 pass |
| Native config resolution (`expo config`) | pass |
| Native JS bundles (`expo export` iOS + Android, Hermes) | compiled |
| Bundle secret scan | clean |
| `expo-doctor` | 17/20; the 3 failures are network-blocked checks (exp.host / RN directory unreachable) |
| iOS simulator / Android emulator / physical device | **not run** (no macOS, no KVM) |
| Development builds / EAS / signed release builds | **not run** (no credentials or build host) |
| Maestro native flows | **written, not run** |

## Current task
Work package 1 complete. Stopped at the Milestone 2 review boundary.

## Exact next actions
1. **Owner:** review the running app (README "Local setup"), and answer the open questions in the final report.
2. **Native verification on real tooling** (needs a Mac with Xcode and/or Android Studio; not possible in this
   container): `npx expo run:ios` / `run:android`, then `maestro test apps/mobile/maestro/`. Record results in
   docs/platform-parity.md.
3. **Milestone 3:** inference adapter (Anthropic candidate — verify current model ids and media limits in official
   docs first), versioned prompts + fixtures, evaluation runner, assessment job using `input_revision`, effective
   capability policy, stale-job protection, usage reservation/settlement.
4. Continue to keep docs/acceptance.md and docs/platform-parity.md current.
