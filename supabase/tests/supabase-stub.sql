-- Minimal stand-in for the parts of Supabase that 0001_accounts.sql relies on.
-- Roles are cluster-wide, so only create them if a previous run hasn't.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
-- Supabase's auth.uid() reads the signed-in user's id from the request's JWT claims.
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase's default privileges grant anon/authenticated on new public tables; mimic that
-- so the migration's explicit revokes/grants are what's actually being tested.
alter default privileges in schema public grant all on tables to anon, authenticated;
