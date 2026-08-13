-- OGDCL Invoice Tracker — shared activity log
--
-- Run this once in the Supabase SQL Editor, same as profiles_setup.sql — and
-- run that one FIRST if you haven't, since this reuses its public.is_admin()
-- function and public.profiles table. Safe to re-run.
--
-- Why this exists: the Activity Log previously lived only in each browser's
-- localStorage, so an action logged on one person's device was invisible to
-- everyone else — there was no real "who entered this invoice" answer across
-- the team. This table makes it a real shared audit trail, and a trigger
-- stamps who/what from the authenticated session + profiles table rather
-- than trusting whatever the client sends, so entries can't be spoofed.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  user_name text not null default '',
  user_role text not null default '',
  action text not null check (action in ('Import', 'Add', 'Edit', 'Delete', 'Undo', 'Restore')),
  detail text not null default '',
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_ts_idx on public.activity_log (ts desc);

alter table public.activity_log enable row level security;

-- Everyone signed in sees the whole shared log — matches the pre-existing
-- behavior where Activity Log wasn't role-gated, only the undo controls were.
drop policy if exists "activity_log_select" on public.activity_log;
create policy "activity_log_select" on public.activity_log
  for select
  using (auth.uid() is not null);

drop policy if exists "activity_log_insert" on public.activity_log;
create policy "activity_log_insert" on public.activity_log
  for insert
  with check (auth.uid() is not null);

-- "Clear log" now wipes shared team history, not just your own browser — Admin-only.
drop policy if exists "activity_log_delete" on public.activity_log;
create policy "activity_log_delete" on public.activity_log
  for delete
  using (public.is_admin());

-- Overwrites whatever the client sent for user_id/user_name/user_role with the
-- caller's real identity from their own session + profiles row, so a log
-- entry can't be forged as someone else.
create or replace function public.stamp_activity_log_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  new.user_id := auth.uid();
  select name, role into p from public.profiles where id = auth.uid();
  new.user_name := coalesce(p.name, '');
  new.user_role := coalesce(p.role, '');
  return new;
end;
$$;

drop trigger if exists stamp_activity_log_actor_trigger on public.activity_log;
create trigger stamp_activity_log_actor_trigger
  before insert on public.activity_log
  for each row execute function public.stamp_activity_log_actor();
