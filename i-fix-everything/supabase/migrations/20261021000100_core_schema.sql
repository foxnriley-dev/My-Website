-- I Fix Everything — core schema (Milestones 1–2)
--
-- Security model (see docs/decisions.md D-006):
--   * Application tables live in schema `app`, which PostgREST does not expose,
--     so clients can only reach data through the versioned API.
--   * The API runs each request in a transaction as role `app_user` with the
--     caller's verified JWT claims, so row-level security is enforced by
--     Postgres even if application code has a bug.
--   * Every child row carries user_id and uses composite foreign keys
--     (parent_id, user_id) so a row can never reference another user's parent.

create schema if not exists app;

do $$ begin
  create role app_user nologin;
exception when duplicate_object then null;
end $$;

grant app_user to postgres;
grant usage on schema app to app_user;

-- Same semantics as app.uid(): the verified `sub` claim set by the API for
-- this transaction, or null when no claims are present.
create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), ''
  )::uuid
$$;
grant execute on function app.uid() to app_user;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function app.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'rows in %.% are immutable', tg_table_schema, tg_table_name
    using errcode = 'check_violation';
end $$;

-- ---------------------------------------------------------------------------
-- Profiles and preferences
-- ---------------------------------------------------------------------------
create table app.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unit_system text not null default 'us_customary' check (unit_system in ('us_customary', 'metric')),
  region text not null default 'US' check (region in ('US')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  notify_case_updates_by_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on app.profiles
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Invite-only beta (enforced by the before-user-created auth hook)
-- ---------------------------------------------------------------------------
create table app.beta_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,           -- sha256 hex of the normalized code; raw codes are never stored
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

create table app.beta_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references app.beta_invites (id) on delete cascade,
  email_hash text not null,                 -- sha256 of lowercased email; no raw email kept here
  redeemed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Machines and immutable machine revisions
-- ---------------------------------------------------------------------------
create table app.machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in
    ('car', 'motorcycle', 'go_kart', 'mini_bike', 'motorized_bicycle', 'small_engine', 'other')),
  nickname text not null check (char_length(nickname) between 1 and 80),
  current_revision integer not null default 0,
  idempotency_key uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, idempotency_key)
);
create index machines_user_idx on app.machines (user_id, created_at desc);
create trigger machines_touch before update on app.machines
  for each row execute function app.touch_updated_at();

create table app.machine_revisions (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null,
  user_id uuid not null,
  revision integer not null check (revision > 0),
  identity jsonb not null,                  -- validated by @ife/contracts MachineIdentity
  installed_components jsonb not null default '[]'::jsonb,
  modifications jsonb not null default '[]'::jsonb,
  changed_fields text[] not null default '{}',
  change_note text check (char_length(change_note) <= 500),
  created_at timestamptz not null default now(),
  unique (machine_id, revision),
  unique (id, user_id),
  unique (id, machine_id),
  foreign key (machine_id, user_id) references app.machines (id, user_id) on delete cascade
);
create trigger machine_revisions_immutable before update on app.machine_revisions
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Repair cases
-- ---------------------------------------------------------------------------
create table app.repair_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  machine_id uuid not null,
  machine_revision_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  status text not null default 'draft' check (status in (
    'draft', 'awaiting_media', 'processing', 'needs_information', 'assessment_ready', 'guide_ready',
    'repair_in_progress', 'verification_pending', 'resolved', 'handed_off', 'archived')),
  -- Safety hold is independent of status and blocks normal workflow when active.
  safety_hold jsonb not null default '{"active": false, "reasons": [], "unresolvedChecks": []}'::jsonb,
  symptoms jsonb not null,
  risk jsonb not null default '{}'::jsonb,
  intake_updated_at timestamptz not null default now(),
  input_revision integer not null default 0 check (input_revision >= 0),
  version integer not null default 0 check (version >= 0),
  last_saved_revision integer,
  idempotency_key uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, idempotency_key),
  foreign key (machine_id, user_id) references app.machines (id, user_id) on delete cascade,
  foreign key (machine_revision_id, user_id) references app.machine_revisions (id, user_id),
  -- the pinned revision must belong to the same machine
  foreign key (machine_revision_id, machine_id) references app.machine_revisions (id, machine_id)
);
create index repair_cases_user_idx on app.repair_cases (user_id, updated_at desc);
create index repair_cases_machine_idx on app.repair_cases (machine_id);
create trigger repair_cases_touch before update on app.repair_cases
  for each row execute function app.touch_updated_at();

create table app.case_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  revision integer not null check (revision > 0),
  input_revision integer not null,
  machine_revision_id uuid not null,
  intake jsonb not null,
  evidence_ids uuid[] not null default '{}',
  safety_hold jsonb not null,
  created_at timestamptz not null default now(),
  unique (case_id, revision),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade,
  foreign key (machine_revision_id, user_id) references app.machine_revisions (id, user_id)
);
create trigger case_revisions_immutable before update on app.case_revisions
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Evidence and media
-- ---------------------------------------------------------------------------
create table app.evidence_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  kind text not null default 'photo' check (kind in ('photo')),
  role text not null check (role in ('overview', 'concern_closeup', 'label', 'other')),
  sort_order integer not null default 0,
  status text not null default 'pending_upload' check (status in
    ('pending_upload', 'uploaded', 'processing', 'ready', 'rejected', 'failed')),
  rejection_reason text check (rejection_reason in
    ('unsupported_type', 'too_large', 'too_many_pixels', 'corrupt_or_unreadable', 'missing_upload', 'limit_reached')),
  caption text check (char_length(caption) <= 500),
  declared_mime text,
  declared_bytes bigint,
  detected_mime text,
  bytes bigint,
  width integer,
  height integer,
  sha256 text,
  -- Server-generated object keys. Originals stay private under the retention policy.
  original_object_key text not null,
  client_platform text not null check (client_platform in ('web', 'ios', 'android')),
  idempotency_key uuid not null,
  upload_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, case_id),
  unique (user_id, idempotency_key),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade
);
create index evidence_case_idx on app.evidence_items (case_id, sort_order);
create trigger evidence_touch before update on app.evidence_items
  for each row execute function app.touch_updated_at();

create table app.media_derivatives (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('preview', 'thumb', 'analysis')),
  object_key text not null,
  mime text not null,
  width integer not null,
  height integer not null,
  bytes bigint not null,
  location_metadata_removed boolean not null,
  created_at timestamptz not null default now(),
  unique (evidence_id, kind),
  foreign key (evidence_id, user_id) references app.evidence_items (id, user_id) on delete cascade
);

-- Crops and annotations always point at their source evidence. AI regions are
-- approximate and require owner confirmation (Milestone 3 writes these).
create table app.evidence_annotations (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null,
  user_id uuid not null,
  source text not null check (source in ('user', 'ai')),
  region jsonb not null,                    -- normalized 0..1 coordinates, never real dimensions
  label text not null check (char_length(label) <= 200),
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (evidence_id, user_id) references app.evidence_items (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- User-visible job records (the durable queue itself is pg-boss)
-- ---------------------------------------------------------------------------
create table app.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid,
  subject_id uuid,
  kind text not null check (kind in ('media_process', 'assessment', 'resource_resolution', 'export', 'deletion')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'superseded')),
  input_revision integer,
  attempts integer not null default 0,
  message text,
  error_code text,
  retryable boolean not null default false,
  idempotency_key text not null,
  queue_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, idempotency_key),
  foreign key (case_id, user_id) references app.repair_cases (id, user_id) on delete cascade
);
create index jobs_case_idx on app.jobs (case_id, created_at desc);
create trigger jobs_touch before update on app.jobs
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Audit trail (no raw symptoms, photos, VINs or secrets)
-- ---------------------------------------------------------------------------
create table app.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  actor text not null check (actor in ('user', 'system', 'admin')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_user_idx on app.audit_events (user_id, created_at desc);

-- Account deletion log. Holds no PII after completion: the user id is the only link.
create table app.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text not null check (scope in ('case', 'account')),
  subject_id uuid,
  status text not null check (status in ('started', 'completed', 'failed')),
  objects_removed integer not null default 0,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table app.profiles enable row level security;
alter table app.machines enable row level security;
alter table app.machine_revisions enable row level security;
alter table app.repair_cases enable row level security;
alter table app.case_revisions enable row level security;
alter table app.evidence_items enable row level security;
alter table app.media_derivatives enable row level security;
alter table app.evidence_annotations enable row level security;
alter table app.jobs enable row level security;
alter table app.audit_events enable row level security;
alter table app.beta_invites enable row level security;
alter table app.beta_invite_redemptions enable row level security;
alter table app.deletion_requests enable row level security;

create policy owner_all on app.profiles for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_all on app.machines for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_read on app.machine_revisions for select to app_user using (user_id = app.uid());
create policy owner_insert on app.machine_revisions for insert to app_user with check (user_id = app.uid());
create policy owner_all on app.repair_cases for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_read on app.case_revisions for select to app_user using (user_id = app.uid());
create policy owner_insert on app.case_revisions for insert to app_user with check (user_id = app.uid());
create policy owner_all on app.evidence_items for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_read on app.media_derivatives for select to app_user using (user_id = app.uid());
create policy owner_all on app.evidence_annotations for all to app_user
  using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_read on app.jobs for select to app_user using (user_id = app.uid());
create policy owner_insert on app.jobs for insert to app_user with check (user_id = app.uid());
create policy owner_cancel on app.jobs for update to app_user using (user_id = app.uid()) with check (user_id = app.uid());
create policy owner_insert on app.audit_events for insert to app_user with check (user_id = app.uid());
create policy owner_insert on app.deletion_requests for insert to app_user with check (user_id = app.uid());
create policy owner_read on app.deletion_requests for select to app_user using (user_id = app.uid());
-- beta_invites / redemptions: no app_user policies at all (auth hook only).

grant select, insert, update on app.profiles to app_user;
grant select, insert, update, delete on app.machines to app_user;
grant select, insert on app.machine_revisions to app_user;
grant select, insert, update, delete on app.repair_cases to app_user;
grant select, insert on app.case_revisions to app_user;
grant select, insert, update, delete on app.evidence_items to app_user;
grant select on app.media_derivatives to app_user;
grant select, insert, update, delete on app.evidence_annotations to app_user;
grant select, insert on app.jobs to app_user;
-- Users may only cancel their own jobs; progress fields are written by the worker.
grant update (status, completed_at) on app.jobs to app_user;
grant insert on app.audit_events to app_user;
grant select, insert on app.deletion_requests to app_user;

-- Nothing in `app` is reachable by the PostgREST roles.
revoke all on all tables in schema app from anon, authenticated;
