-- Private media bucket. No storage.objects policies are granted to anon or
-- authenticated for this bucket, so clients can only read or write objects
-- through short-lived signed URLs the API issues after an ownership check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-media',
  'case-media',
  false,
  15728640,  -- 15 MiB per original (MEDIA_LIMITS.maxBytes)
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Runtime settings readable by the auth hook and the API (not by clients).
-- ---------------------------------------------------------------------------
create table app.runtime_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app.runtime_settings enable row level security;
insert into app.runtime_settings (key, value) values
  ('invite_required', 'true'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- before-user-created auth hook: invite-only beta.
--
-- Signup passes `invite_code` in user metadata. The code is normalized, hashed
-- and matched against app.beta_invites; raw codes are never stored server-side.
-- Users created through the Auth admin API with app_metadata.ife_admin_created
-- (settable only with the service key) bypass the gate — used for operator
-- provisioning and automated tests.
-- ---------------------------------------------------------------------------
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  required boolean;
  raw_code text;
  invite record;
begin
  select coalesce((value)::boolean, true) into required
    from app.runtime_settings where key = 'invite_required';
  if required is false then
    return '{}'::jsonb;
  end if;

  if coalesce((event -> 'user' -> 'app_metadata' ->> 'ife_admin_created')::boolean, false) then
    return '{}'::jsonb;
  end if;

  raw_code := upper(regexp_replace(coalesce(event -> 'user' -> 'user_metadata' ->> 'invite_code', ''), '\s', '', 'g'));
  if raw_code = '' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'I Fix Everything is in an invite-only beta. Enter your invite code to sign up.'));
  end if;

  select * into invite from app.beta_invites
   where code_hash = encode(sha256(convert_to(raw_code, 'UTF8')), 'hex')
     and (expires_at is null or expires_at > now())
     and uses < max_uses
   for update;

  if not found then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'That invite code is not valid, has expired, or has already been used.'));
  end if;

  update app.beta_invites set uses = uses + 1 where id = invite.id;
  insert into app.beta_invite_redemptions (invite_id, email_hash)
  values (invite.id, encode(sha256(convert_to(lower(coalesce(event -> 'user' ->> 'email', '')), 'UTF8')), 'hex'));

  return '{}'::jsonb;
end;
$$;

revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

-- Operator helper: create an invite and return the raw code once.
create or replace function app.create_beta_invite(max_uses integer default 1, valid_days integer default 30, note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  insert into app.beta_invites (code_hash, max_uses, expires_at, note)
  values (encode(sha256(convert_to(code, 'UTF8')), 'hex'), max_uses, now() + make_interval(days => valid_days), note);
  return code;
end;
$$;
revoke execute on function app.create_beta_invite(integer, integer, text) from public, app_user;
