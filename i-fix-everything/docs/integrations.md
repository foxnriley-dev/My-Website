# Integration readiness

Legend — **Live tested**: exercised against the real service. **Local real**: the real software running locally
(not the hosted production service). **Fixture**: synthetic data only. **Missing**: not configured.

| Integration | Purpose | Status | Blocked by | Notes |
|---|---|---|---|---|
| Supabase Auth (GoTrue) | Identity for web, iOS, Android | **Local real** — signup/hook, password sign-in, JWKS (ES256) verification, session revocation tested | Credentials (hosted project) | Hosted project, SMTP provider, production redirect URLs and universal/app links not configured |
| Supabase Postgres 17 | System of record, RLS | **Local real** — all migrations applied; RLS + composite-FK isolation tested | Credentials | Choose region, backups/PITR tier, connection pooling for production |
| Supabase Storage | Private photo storage, signed URLs | **Local real** — signed upload, size limit, private reads, deletion tested | Credentials | Confirm hosted file-size limit ≥ 15 MiB on the plan |
| pg-boss queue | Durable background jobs | **Local real** — enqueue-in-transaction, worker processing, retries configured | Hosting decision | Worker must run as a long-lived process (not serverless) — see deployment notes |
| sharp / libvips | Image validation & derivatives | **Local real** (unit + integration) | — | HEIC path uses `heic-decode` (WASM libheif): **wired but not fixture-tested** (no HEIC sample can be generated here) |
| Mailpit (local only) | Captures auth emails in development | Local real | — | Production needs a real SMTP provider (owner account) |
| Expo / EAS Build | Native development and release builds | **Config only.** `expo export` bundles compiled for iOS + Android | Developer accounts, signing credentials, a macOS/Android build host or EAS account | No simulator/emulator/device in this environment; `expo-doctor` network checks blocked (exp.host) |
| Apple App Store / StoreKit | iOS distribution, later IAP | Missing | Apple Developer account, bundle id, agreements | Milestone 5+ |
| Google Play / Billing | Android distribution, later IAP | Missing | Play Console account, package name, signing key | Milestone 5+ |
| Stripe (test mode) | Web subscription checkout | Missing | Owner Stripe account (test keys) | Milestone 5; never live until approved |
| Inference provider (Anthropic candidate) | Diagnostic pipeline | Missing | API key + budget approval; model selection via docs + evaluation | Milestone 3. No model id hardcoded |
| YouTube Data API | Video discovery | Missing | API key + quota | Milestone 4 |
| Parts catalog / merchant data | Fitment + offers | Missing | Lawful data source or curated collection with rights | Milestone 4; no retailer API assumed |
| NHTSA vPIC | VIN decoding aid (identification only) | Missing | — (public API) | Milestone 3+; not a fitment database |
| Qualified mechanical review | Approve tasks, sources, guides | Missing | Human reviewers | Launch gate; cannot be self-certified |

## Environment notes for this build container
- Reachable: npm registry, Docker Hub, raw.githubusercontent.com. Blocked: docs.expo.dev, supabase.com, nextjs.org,
  docs.anthropic.com, exp.host, public.ecr.aws blob CDN. Documentation was read from the projects' GitHub sources and
  from installed package type definitions.
- Local Supabase was started with `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`.

## Production configuration checklist (not done)
- Hosted Supabase project; set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` in the host's secret manager.
- Auth: enable email confirmation (already on locally), custom SMTP, exact redirect allow-list per environment
  (`https://<web>/auth/callback`, `ifixeverything://auth/callback`, staging equivalents), enable the
  `before-user-created` hook pointing at `public.hook_before_user_created`.
- Apply `supabase/migrations` with `supabase db push` (review first).
- Run the worker as a separate always-on service with the same `DATABASE_URL`.
- `APP_ENV=production` refuses local URLs, the public local secret key and `DEMO_MODE` at startup.
