-- Overload: invite-only accounts, with one synced copy of each person's training data.
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- 1. Invite list ---------------------------------------------------------------
-- Add people with:  insert into public.allowed_emails (email) values ('name@example.com');
-- Nobody using the app can read or change this table: RLS is on and there are no policies,
-- so only you (from the dashboard / SQL Editor) can.
create table if not exists public.allowed_emails (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- 2. Each person's data ----------------------------------------------------------
-- One row per user holding their whole app state (well under 100 KB a year).
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (pg_column_size(state) < 1000000)
);
alter table public.user_state enable row level security;

revoke all on public.user_state from anon, authenticated;
grant select, insert, update on public.user_state to authenticated;

-- Signed-in users can only ever see and write their own row. No delete from the app.
drop policy if exists "Read own state" on public.user_state;
create policy "Read own state" on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Insert own state" on public.user_state;
create policy "Insert own state" on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Update own state" on public.user_state;
create policy "Update own state" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Invite-only sign-up -----------------------------------------------------------
-- Runs inside the database whenever Supabase is about to create a new account, so an
-- email that isn't on the invite list is refused however the request is made.
create or replace function public.enforce_invite_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_emails a where lower(a.email) = lower(new.email)
  ) then
    raise exception 'This email is not on the invite list.';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_invite_list() from public, anon, authenticated;

drop trigger if exists enforce_invite_list on auth.users;
create trigger enforce_invite_list
  before insert on auth.users
  for each row execute function public.enforce_invite_list();
