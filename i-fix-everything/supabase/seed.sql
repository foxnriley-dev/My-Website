-- NON-PRODUCTION seed data for the local development stack only (applied by `supabase db reset`).
-- Never run against a hosted project.

-- Local invite code "LOCALDEV01" (100 uses, 1 year) so sign-up can be tried end to end with Mailpit.
insert into app.beta_invites (code_hash, max_uses, expires_at, note)
values (encode(sha256(convert_to('LOCALDEV01', 'UTF8')), 'hex'), 100, now() + interval '365 days', 'local development seed')
on conflict (code_hash) do nothing;
