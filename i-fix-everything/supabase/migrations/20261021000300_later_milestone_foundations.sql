-- Foundations for Milestones 3–6. Tables exist now so earlier data and API
-- shapes do not need rework; no consumer feature uses them until its
-- milestone ships. Reference data (sources, parts, videos, tasks) has no
-- app_user grants yet — those arrive with the feature, behind review.

-- ---------------------------------------------------------------------------
-- Feature switches (kill switches). Server-side only.
-- ---------------------------------------------------------------------------
create table app.feature_switches (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table app.feature_switches enable row level security;
insert into app.feature_switches (key, enabled, description) values
  ('assessment', false, 'Standard diagnostic assessment pipeline (Milestone 3)'),
  ('deep_diagnostic', false, 'Pro Deep Diagnostic mode (Milestone 5, after evaluation)'),
  ('parts', false, 'Parts, fitment and merchant offers (Milestone 4)'),
  ('videos', false, 'YouTube resource discovery (Milestone 4)'),
  ('guides', false, 'Reviewed repair guides and repair mode (Milestone 4)'),
  ('billing', false, 'Live purchase flows. Sandbox only until launch approval.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Plans, subscriptions, entitlements, usage
-- ---------------------------------------------------------------------------
create table app.plans (
  tier text primary key check (tier in ('free', 'pro')),
  display_name text not null
);
insert into app.plans values ('free', 'Free'), ('pro', 'I Fix Everything Pro') on conflict do nothing;

create table app.plan_versions (
  id text primary key,
  tier text not null references app.plans (tier),
  price_usd_cents integer check (price_usd_cents is null or price_usd_cents > 0),
  billing_interval text check (billing_interval in ('month', 'year')),
  limits jsonb not null,
  price_approved boolean not null,
  quotas_provisional boolean not null,
  active_from timestamptz not null default now(),
  unique (id, tier)
);
insert into app.plan_versions (id, tier, price_usd_cents, billing_interval, limits, price_approved, quotas_provisional) values
  ('free-2026-10-v1', 'free', null, null,
   '{"savedMachines": 1, "standardRunsPerPeriod": 3, "deepRunsPerPeriod": 0, "imagesPerRun": 3}', true, true),
  ('pro-2026-10-v1', 'pro', 1499, 'month',
   '{"savedMachines": 10, "standardRunsPerPeriod": 100, "deepRunsPerPeriod": 20, "imagesPerRun": 8}', true, true)
on conflict (id) do nothing;

create table app.billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  app_store_app_account_token uuid unique,  -- links StoreKit purchases to this account
  google_obfuscated_account_id text unique,
  created_at timestamptz not null default now()
);

create table app.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'app_store', 'google_play')),
  environment text not null check (environment in ('sandbox', 'production')),
  provider_subscription_id text not null,
  original_transaction_id text,
  product_id text not null,
  plan_version_id text not null references app.plan_versions (id),
  state text not null check (state in
    ('active', 'trialing', 'in_grace', 'past_due', 'cancelled_pending_expiry', 'expired', 'refunded', 'revoked')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_at timestamptz,               -- for out-of-order event reconciliation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, environment, provider_subscription_id)
);

create table app.purchase_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'app_store', 'google_play')),
  provider_event_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  signature_verified boolean not null,
  payload_sha256 text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text,
  unique (provider, provider_event_id)       -- B03: duplicate delivery is a no-op
);

create table app.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null references app.plans (tier),
  plan_version_id text not null references app.plan_versions (id),
  source text not null check (source in ('web_checkout', 'app_store', 'google_play', 'admin_grant')),
  subscription_id uuid references app.subscriptions (id) on delete set null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index entitlements_user_idx on app.entitlements (user_id);

create table app.usage_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('standard', 'deep')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  unit_limit integer not null check (unit_limit >= 0),
  used integer not null default 0,
  reserved integer not null default 0,
  check (used >= 0 and reserved >= 0 and used + reserved <= unit_limit),  -- B02: cannot overspend
  check (period_end > period_start),
  unique (user_id, kind, period_start),
  unique (id, user_id)
);

create table app.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  window_id uuid not null,
  kind text not null check (kind in ('standard', 'deep')),
  case_id uuid,
  input_revision integer,
  idempotency_key text not null,
  state text not null check (state in ('reserved', 'settled', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, idempotency_key),         -- retries never reserve twice
  foreign key (window_id, user_id) references app.usage_windows (id, user_id) on delete cascade
);

create table app.usage_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references app.usage_reservations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  units integer not null check (units = 1),
  created_at timestamptz not null default now()
);

create table app.provider_costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references app.jobs (id) on delete set null,
  provider text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  images integer,
  cost_usd_micros bigint,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assessments (immutable) and questions
-- ---------------------------------------------------------------------------
create table app.assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  input_revision integer not null,
  case_revision_id uuid references app.case_revisions (id),
  mode text not null check (mode in ('standard', 'deep')),
  status text not null check (status in ('published', 'rejected', 'superseded')),
  schema_version text not null,
  payload jsonb not null,
  prompt_version text not null,
  model_id text not null,
  job_id uuid references app.jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, case_id),
  unique (id, user_id),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade
);
create trigger assessments_immutable before update of payload, input_revision, case_id, user_id on app.assessments
  for each row execute function app.forbid_mutation();

-- An assessment may only reference evidence from its own case (composite FKs).
create table app.assessment_evidence (
  assessment_id uuid not null,
  evidence_id uuid not null,
  case_id uuid not null,
  primary key (assessment_id, evidence_id),
  foreign key (assessment_id, case_id) references app.assessments (id, case_id) on delete cascade,
  foreign key (evidence_id, case_id) references app.evidence_items (id, case_id) on delete cascade
);

create table app.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  user_id uuid not null,
  prompt text not null,
  why text,
  answer_schema jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (assessment_id, user_id) references app.assessments (id, user_id) on delete cascade
);

create table app.question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  user_id uuid not null,
  answer_state text not null check (answer_state in ('answered', 'unknown', 'skipped', 'cannot_safely_check')),
  answer jsonb,
  created_at timestamptz not null default now(),
  foreign key (question_id, user_id) references app.assessment_questions (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Sources, specifications, reviewed tasks
-- ---------------------------------------------------------------------------
create table app.sources (
  id uuid primary key default gen_random_uuid(),
  publisher text not null,
  title text not null,
  source_revision text,
  rights_status text not null check (rights_status in
    ('licensed', 'permission_granted', 'public_domain', 'public_government', 'owner_uploaded_private', 'unknown')),
  owner_user_id uuid references auth.users (id) on delete cascade,  -- private user manuals
  applicability jsonb not null default '{}'::jsonb,
  location text,
  content_sha256 text,
  retrieved_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.source_passages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references app.sources (id) on delete cascade,
  location text not null,
  body text not null,
  body_sha256 text not null
);

create table app.specifications (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references app.sources (id) on delete cascade,
  name text not null,
  value numeric,                            -- null = unknown; never 0 as a stand-in
  value_text text,
  original_unit text,
  applicability jsonb not null,
  source_location text not null,
  verification_status text not null check (verification_status in
    ('unverified', 'source_supported', 'reviewer_verified', 'conflicting')),
  created_at timestamptz not null default now()
);

-- Reviews record real people only. No code path may create a reviewer.
create table app.reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('approved_task', 'source', 'guide_template', 'video')),
  subject_id uuid not null,
  reviewer_name text not null,
  reviewer_qualification text not null,
  decision text not null check (decision in ('approved', 'rejected', 'revoked')),
  notes text,
  created_at timestamptz not null default now()
);

create table app.approved_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text not null,
  machine_scope jsonb not null,
  status text not null check (status in ('draft', 'approved', 'revoked')),
  review_id uuid references app.reviews (id),
  created_at timestamptz not null default now(),
  check (status <> 'approved' or review_id is not null)  -- no approval without a review record
);

-- ---------------------------------------------------------------------------
-- Parts, fitment, offers, videos
-- ---------------------------------------------------------------------------
create table app.parts (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  family text not null,
  created_at timestamptz not null default now()
);

create table app.part_identifiers (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references app.parts (id) on delete cascade,
  id_type text not null check (id_type in ('oem', 'aftermarket', 'supersedes', 'superseded_by', 'merchant_sku')),
  value text not null,                      -- always a string; leading zeros matter
  issuer text,
  unique (part_id, id_type, value)
);

create table app.fitment_assertions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references app.parts (id) on delete cascade,
  machine_revision_id uuid references app.machine_revisions (id) on delete cascade,
  state text not null check (state in ('unverified', 'needs_information', 'source_supported', 'contradicted', 'stale')),
  confirmed_attributes jsonb not null default '{}'::jsonb,
  missing_attributes jsonb not null default '[]'::jsonb,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  check (state <> 'source_supported' or cardinality(source_ids) > 0)
);

create table app.merchant_offers (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references app.parts (id) on delete cascade,
  merchant text not null,
  url text not null check (url like 'https://%'),
  price_cents integer,
  currency text check (currency in ('USD')),
  is_kit boolean not null default false,
  kit_contents text,
  shipping_note text,
  retrieval_adapter text not null,
  checked_at timestamptz not null
);

create table app.video_references (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('youtube')),
  provider_video_id text not null,
  title text not null,
  channel text,
  duration_seconds integer,
  review_label text not null check (review_label in
    ('exact_reviewed', 'same_family', 'general_explanation', 'metadata_candidate')),
  review_basis text,
  availability text not null check (availability in ('available', 'private', 'deleted', 'restricted', 'unembeddable')),
  checked_at timestamptz not null,
  check (review_label <> 'exact_reviewed' or review_basis is not null),
  unique (provider, provider_video_id)
);

-- ---------------------------------------------------------------------------
-- Guides, progress, outcomes, incidents
-- ---------------------------------------------------------------------------
create table app.guide_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  machine_revision_id uuid not null,
  approved_task_id uuid references app.approved_tasks (id),
  procedure_revision text not null,
  input_revision integer not null,
  content jsonb not null,
  status text not null check (status in ('draft', 'executable', 'blocked', 'invalidated')),
  invalidated_reason text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade,
  foreign key (machine_revision_id, user_id) references app.machine_revisions (id, user_id),
  check (status <> 'executable' or approved_task_id is not null)
);

create table app.guide_step_progress (
  id uuid primary key default gen_random_uuid(),
  guide_revision_id uuid not null,
  user_id uuid not null,
  step_key text not null,
  state text not null check (state in ('pending', 'done', 'skipped', 'unknown', 'mine_looks_different', 'stopped')),
  response jsonb,
  note text,
  updated_at timestamptz not null default now(),
  unique (guide_revision_id, step_key),
  foreign key (guide_revision_id, user_id) references app.guide_revisions (id, user_id) on delete cascade
);

create table app.case_outcomes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  result text not null check (result in ('fixed', 'partly_fixed', 'not_fixed', 'handed_off')),
  replaced_parts jsonb not null default '[]'::jsonb,
  unresolved_concerns text,
  created_at timestamptz not null default now(),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade
);

create table app.incident_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  case_id uuid references app.repair_cases (id) on delete set null,
  category text not null check (category in ('safety', 'wrong_information', 'privacy', 'billing', 'other')),
  description text not null check (char_length(description) <= 4000),
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS for the new tables
-- ---------------------------------------------------------------------------
alter table app.plans enable row level security;
alter table app.plan_versions enable row level security;
alter table app.billing_accounts enable row level security;
alter table app.subscriptions enable row level security;
alter table app.purchase_events enable row level security;
alter table app.entitlements enable row level security;
alter table app.usage_windows enable row level security;
alter table app.usage_reservations enable row level security;
alter table app.usage_events enable row level security;
alter table app.provider_costs enable row level security;
alter table app.assessments enable row level security;
alter table app.assessment_evidence enable row level security;
alter table app.assessment_questions enable row level security;
alter table app.question_answers enable row level security;
alter table app.sources enable row level security;
alter table app.source_passages enable row level security;
alter table app.specifications enable row level security;
alter table app.reviews enable row level security;
alter table app.approved_tasks enable row level security;
alter table app.parts enable row level security;
alter table app.part_identifiers enable row level security;
alter table app.fitment_assertions enable row level security;
alter table app.merchant_offers enable row level security;
alter table app.video_references enable row level security;
alter table app.guide_revisions enable row level security;
alter table app.guide_step_progress enable row level security;
alter table app.case_outcomes enable row level security;
alter table app.incident_reports enable row level security;

create policy read_all on app.plans for select to app_user using (true);
create policy read_all on app.plan_versions for select to app_user using (true);
create policy owner_read on app.subscriptions for select to app_user using (user_id = app.uid());
create policy owner_read on app.entitlements for select to app_user using (user_id = app.uid());
create policy owner_read on app.usage_windows for select to app_user using (user_id = app.uid());
create policy owner_read on app.usage_reservations for select to app_user using (user_id = app.uid());
create policy owner_read on app.assessments for select to app_user using (user_id = app.uid());
create policy owner_read on app.assessment_questions for select to app_user using (user_id = app.uid());
create policy owner_all on app.question_answers for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_read on app.guide_revisions for select to app_user using (user_id = app.uid());
create policy owner_all on app.guide_step_progress for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_all on app.case_outcomes for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_insert on app.incident_reports for insert to app_user with check (user_id = app.uid());
create policy owner_read on app.incident_reports for select to app_user using (user_id = app.uid());

grant select on app.plans, app.plan_versions to app_user;
grant select on app.subscriptions, app.entitlements, app.usage_windows, app.usage_reservations to app_user;
grant select on app.assessments, app.assessment_questions, app.guide_revisions to app_user;
grant select, insert, update on app.question_answers, app.guide_step_progress, app.case_outcomes to app_user;
grant select, insert on app.incident_reports to app_user;

revoke all on all tables in schema app from anon, authenticated;
