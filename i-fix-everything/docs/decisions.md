# Decisions

Material implementation choices. Routine choices (folder names, field names, padding) are not listed.
Newest at the bottom. Each entry: decision → why → how to reverse.

### D-001 Project placement: `i-fix-everything/` inside the existing `My-Website` repo
The repository already contained an unrelated static portfolio (index.html, styles.css, script.js) on its
deployment branch. The prompt says not to replace an existing project, so the app is a self-contained pnpm
monorepo in a subfolder; the portfolio is untouched. *Reverse:* move the folder to its own repository (no paths
outside it are referenced).

### D-002 Platforms: website + native iOS + native Android from day one
Owner-confirmed (overrides the blueprint's web-first direction). Native apps use React Native components and
Expo Router; nothing wraps the website in a WebView. The public home page and future admin are web-only.

### D-003 Versions (selected October 2026 from the npm registry, pinned)
Next.js 16.4.2, React 19.3.0, Expo SDK 58 (expo 58.0.16, React Native 0.88.0, expo-router 58), TypeScript 6.0
(Expo's template pin; TypeScript 7 exists but Expo targets 6), Zod 4.6, TanStack Query 5.104, Supabase JS 2.118,
@supabase/ssr 0.12, pg-boss 12.38, postgres.js 3.4, sharp 0.35, Vitest 5, Playwright 1.64, jest-expo 58.
Native module versions were matched to SDK 58's `bundledNativeModules.json` (read from the Expo repo because
docs.expo.dev and exp.host are blocked in the build environment).

### D-004 pnpm with `nodeLinker: hoisted`
Expo supports isolated installs from SDK 54, but hoisting guarantees a single React/React Native copy shared by
web and mobile and avoids peer-resolution surprises in RN libraries. *Reverse:* remove the line and reinstall;
re-run `expo export` and the test suites.

### D-005 One canonical API in the web app, framework-agnostic
`packages/server/src/http.ts` exports `handleApiRequest(Request) → Response`; Next mounts it at
`app/api/v1/[...path]/route.ts`. No core operation is a server action. Integration tests call the same handler
directly, and the shared client can target it through any `fetch`. It can move to a standalone server without
changes. Errors are stable `{ error: { code, message, requestId, retryable, fieldErrors?, current? } }`.

### D-006 Data access: private `app` schema + RLS enforced per request
Tables live in schema `app`, which PostgREST does not expose, so a client holding the publishable key cannot
read or write data except through the API (verified: `/rest/v1/machines` → not found). Each API request runs in
a transaction that sets `role = app_user` and the verified JWT claims, so Postgres row-level security applies to
every statement even if service code has a bug. Child rows carry `user_id` and use **composite foreign keys**
`(parent_id, user_id)` (and `(evidence_id, case_id)` for assessments), so a row can never reference another
user's parent or another case's photo. The worker uses a privileged connection scoped by ids from trusted rows.

### D-007 Auth: Supabase Auth, asymmetric JWT verification + live session check
The API verifies access tokens with the project JWKS (ES256), checks issuer/audience, then confirms the
`session_id` still exists in `auth.sessions`, so sign-out/revocation takes effect immediately rather than at
token expiry. Web stores the session in cookies via `@supabase/ssr` (a Next 16 `proxy.ts` refreshes it); native
stores it in the iOS Keychain / Android Keystore via `expo-secure-store` (chunked, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
Both use PKCE for email links.

### D-008 Invite-only beta enforced in the database
A `before-user-created` Auth hook (`public.hook_before_user_created`) requires a valid, unexpired, unused invite
code (only SHA-256 hashes are stored). Users created with the Auth admin API and
`app_metadata.ife_admin_created=true` (service key only) bypass it for operator provisioning and tests.
*Note:* the raw code remains in the user's `user_metadata` after signup. *Reverse:* set
`app.runtime_settings.invite_required = false`.

### D-009 Durable jobs: pg-boss on the same Postgres
No extra infrastructure; survives restarts; retries with exponential backoff (4 retries, 5 s base, 300 s cap).
The user-visible `app.jobs` row and the queue entry are written **in the same transaction**, and the queue job id
equals the `app.jobs` id. Because `app_user` has no grants on the `pgboss` schema, `enqueueInTx` temporarily
resets the role for the pg-boss insert only and restores RLS immediately; the payload contains only ids that
RLS-checked queries already proved belong to the caller.

### D-010 Media pipeline
Direct-to-storage uploads with **server-generated keys** (`user/case/evidence/original`) via short-lived signed
upload URLs, issued only after an RLS ownership check. The private `case-media` bucket has no client policies.
The worker detects the real type from bytes (`file-type`), enforces 15 MB and a 50 MP decoded-pixel ceiling
before full decode (sharp `limitInputPixels`; HEIC via `heic-decode` with a dimension check first), applies EXIF
orientation and re-encodes three derivatives (preview/thumb WebP, analysis JPEG ≤1568 px) **without metadata**.
Rejected originals are deleted; accepted originals stay private. Native clients also re-encode to JPEG on device
(HEIC conversion, orientation, metadata dropped) before upload. Abandoned upload sessions are swept after 24 h.

### D-011 Optimistic concurrency and revisions
- Machines: identity edits create immutable `machine_revisions` (DB trigger forbids updates); clients send
  `expectedRevision`; mismatches return 409 with the current revision.
- Cases: `version` guards edits (409 + server copy); `input_revision` increments on every material change
  (symptoms, risk answers, usable evidence added/removed, machine revision re-pinned). `case_revisions` are
  immutable frozen snapshots. Cases pin a machine revision and report `machineRevisionStale` when the machine moves on.
- The shared `useIntakeDraft` hook distinguishes "saved on this device" from "saved to your account", turns a lost
  race into a user-resolved conflict (keep mine / use theirs), and never adopts an *older* server copy over newer text.

### D-012 Safety screening at intake (deterministic, server-authoritative)
Risk questions depend on category/power type; answers are `yes / no / unknown / skipped / cannot_safely_check`.
`yes` raises a hold; unknown-type answers are listed as unresolved (never treated as safe). A conservative wording
screen also raises holds from the description, even when an answer says "no" (contradictions are not silently
resolved). The server recomputes holds on every material update; capabilities are derived server-side and a hold
blocks assessment/guides regardless of plan or switches.

### D-013 Case status use in Milestone 2
Only states backed by real work are used: `draft` and `awaiting_media` (uploads/processing in flight), plus
`archived` via `archived_at`. "Save this repair" freezes a case revision; it does not pretend to start a diagnosis.
Assessment/parts/videos/guide capabilities report `not_built` with the planned milestone.

### D-014 Plans and entitlements
Versioned plan config in `packages/domain/src/plans.ts` and `app.plan_versions` (Free: 1 machine, 3 standard
runs, 3 images/run; Pro USD 14.99/month approved; 10 machines, 100 standard + 20 deep runs, 8 images/run —
allowances provisional). Effective tier is resolved only from server `app.entitlements` rows. The Free machine
limit is enforced now; excess machines are never deleted (archive to make room). Billing tables, usage windows
(with a CHECK that `used + reserved ≤ limit`), reservations and idempotent purchase events exist; purchase flows
are Milestone 5 and `billing` is switched off.

### D-015 Design system
Charcoal/off-white surfaces with a restrained blue accent, defined once in `@ife/design-tokens`, emitted as CSS
variables (`--ife-*`) for Tailwind v4 on web and used directly in native styles. Light/dark/system themes. Status is
always icon + text. Radix primitives on web (Tabs, AlertDialog), React Native core components on native,
Ionicons on native and Lucide on web. 48 px minimum targets; `prefers-reduced-motion` honoured.

### D-016 Inference provider (Milestone 3, not implemented)
Anthropic is the initial candidate behind a provider adapter. No model identifier is hardcoded; selection waits
for documentation review and evaluation in Milestone 3. Consumer AI requests will use a separately configured API key.

### D-017 Native environment hygiene
`apps/mobile/.env.local` receives only `EXPO_PUBLIC_*` values. `scripts/check-bundle-secrets.mjs` scans web
static chunks and native Hermes bundles for actual secret values and server-only modules. ESLint forbids
importing `@ife/server`, `postgres`, `pg-boss` or `next/*` from native and shared packages, and `@ife/server`
throws if loaded in a browser or React Native runtime.
