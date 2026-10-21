# Deployment notes (not deployed)

Nothing is deployed. These notes record the intended shape so Milestone 5 can prepare staging.

- **Web + API:** `apps/web` (Next.js, Node runtime). The `/api/v1` routes need the server env vars from `.env.example`.
  Any Node host works; serverless is acceptable for the API because long work runs in the worker.
- **Worker:** `apps/worker` must run as an always-on process (container/VM) — pg-boss polls Postgres and retries
  with backoff. Scale horizontally; pg-boss uses `SKIP LOCKED`.
- **Database/Auth/Storage:** hosted Supabase project; apply `supabase/migrations` with the Supabase CLI after review.
- **Secrets:** host secret manager only. `APP_ENV=production` refuses local URLs, the public local secret key and `DEMO_MODE`.
- **Monitoring/recovery/incidents:** structured JSON logs (`level`, `msg`, `requestId`; no bodies/tokens) are emitted by
  the API and worker. Dashboards, alerting, backup/restore drills and the incident runbook are Milestone 5 deliverables.
