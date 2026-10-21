# I Fix Everything

A repair companion for cars, motorcycles, go karts, mini bikes, motorized bicycles and small engine equipment:
a responsive website plus native iOS and Android apps sharing one backend.

> Status: **Milestones 1–2 (Foundation + Evidence intake)** are implemented. Diagnosis, parts, videos, guides and
> billing are *not* available yet — the apps say so honestly. See [docs/build-status.md](docs/build-status.md).

This folder lives inside the `My-Website` repository; the portfolio site at the repository root is unrelated and untouched.

## Layout

| Path | What |
|---|---|
| `apps/web` | Next.js 16 website and browser app. Also hosts the canonical **`/api/v1`** HTTPS API used by all clients. |
| `apps/mobile` | Expo SDK 58 / React Native 0.88 app (Expo Router) for iOS and Android. |
| `apps/worker` | Background worker (pg-boss durable queue): photo validation and private derivatives. |
| `packages/contracts` | Zod runtime schemas + types shared by server and all clients. |
| `packages/domain` | Pure, client-safe rules: identity completeness, safety screening, intake readiness, plans/entitlements, units, invariants, branding. |
| `packages/api-client` | Typed API client, upload orchestration, React Query hooks and the intake-draft hook (shared by web and native). |
| `packages/design-tokens` | Colors, spacing, type scale for web (CSS variables) and native. |
| `packages/server` | **Server-only**: auth verification, RLS-scoped DB access, storage, queue, services, HTTP router. |
| `supabase/` | Local stack config and SQL migrations (schema, RLS, storage bucket, invite hook). |
| `docs/` | Scope, decisions, status, integrations, acceptance, parity, mobile release, subscriptions, privacy. |

## Prerequisites

- Node.js ≥ 22.13 and pnpm 10 (`corepack enable`)
- Docker (for the local Supabase stack: Postgres 17, Auth, Storage, Mailpit)
- For native apps: Xcode (iOS) and/or Android Studio + SDK, and a development build (Expo Go is not used)

## Local setup

```sh
cd i-fix-everything
pnpm install
pnpm db:start            # starts local Supabase and applies supabase/migrations
pnpm env:local           # writes .env.local files from the running stack (mobile gets public values only)
pnpm dev:web             # http://localhost:3000  (website + /api/v1)
pnpm dev:worker          # photo processing worker (separate terminal)
```

If Docker Hub is your only registry access (as in some CI/cloud sandboxes), start the stack with
`SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io pnpm db:start`.

The beta is **invite-only**, enforced by a Supabase Auth hook in the database:

```sh
node scripts/create-invite.mjs 1 30 "tester name"   # prints a one-time invite code
node scripts/create-test-user.mjs                    # local only: confirmed user + password, bypasses invite
```

Emails sent by the local stack (confirmation, password reset) appear in Mailpit at http://127.0.0.1:54324.

### Native apps

```sh
cd apps/mobile
# Point the app at your machine: iOS simulator http://127.0.0.1:3000, Android emulator http://10.0.2.2:3000,
# physical device http://<your-LAN-IP>:3000 — set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env.local
# (and the Supabase URL the device can reach).
npx expo run:ios          # or: npx expo run:android   (builds a development client locally)
# or with EAS: eas build --profile development --platform ios|android
pnpm start                # Metro for the development client
```

Native identifiers are development placeholders (`dev.placeholder.ifixeverything.*`); see
[docs/mobile-release.md](docs/mobile-release.md).

## Checks

```sh
pnpm typecheck                     # all 8 workspaces
pnpm lint                          # ESLint (also blocks server imports from shared/native code)
pnpm test:unit                     # domain, contracts, worker media validation
pnpm test:integration              # against the running local Supabase (two-account isolation, uploads, queue…)
pnpm test:mobile                   # jest-expo: secure storage, upload recovery, screens, conflict handling
pnpm --filter @ife/web build && scripts/restart-web.sh && pnpm test:e2e   # Playwright (desktop + phone)
cd apps/mobile && npx expo export --platform ios --platform android     # native bundles
node scripts/check-bundle-secrets.mjs                                    # no secret values in client bundles
```

## Configuration

See [`.env.example`](.env.example). Server secrets (`SUPABASE_SECRET_KEY`, `DATABASE_URL`) are used only by
`apps/web` (API) and `apps/worker`; clients receive publishable values only. Never paste secrets into chat; set
them in your hosting provider's secret manager.
