-- OGDCL Invoice Tracker — user profiles table
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent (CREATE ... IF NOT EXISTS / OR REPLACE,
-- ON CONFLICT DO NOTHING).
--
-- Why this exists: the app previously stored role/name/etc only in each user's own
-- auth.users.raw_user_meta_data, readable/writable only by that same signed-in user
-- via the public anon key. There was no way for an Admin to see or edit *other*
-- people's accounts without the service_role key (which must never be shipped to the
-- browser). This table mirrors the account fields the app needs into a normal table
-- that Row Level Security can govern with ordinary rules: everyone can read/edit their
-- own row, Admins can read/edit everyone's, and only Admins can change the `role`
-- column (enforced by trigger, not just UI).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'Viewer' check (role in ('Admin', 'Editor', 'Viewer')),
  initials text not null default '',
  phone text,
  dept text default 'Drilling Fluids',
  designation text,
  twofa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Runs as the table owner (bypassing RLS) so it can check a user's own role without
-- the policy that calls it recursively re-invoking itself.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'Admin'
  );
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update
  using (auth.uid() = id or public.is_admin());

-- Row inserts/deletes happen only via the trigger below and cascading auth.users
-- deletes — there's no "create/delete a profile directly" path from the client.

-- Blocks a non-admin from changing `role` (their own or, since profiles_update
-- already restricts *which* rows they can touch, only ever their own anyway) —
-- e.g. a user editing their name in Settings can't slip a role change into the
-- same request.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Auto-creates a profile (defaulting to Viewer) whenever someone signs up, so the
-- Users page never has an auth account missing a manageable row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'Viewer'),
    coalesce(
      new.raw_user_meta_data ->> 'initials',
      upper(left(coalesce(new.raw_user_meta_data ->> 'name', new.email), 2))
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time import: brings every existing auth account (previously managed only via
-- raw_user_meta_data) into profiles. Re-running this after the app has been used is
-- safe — ON CONFLICT DO NOTHING never overwrites edits already made in the new table.
insert into public.profiles (id, email, name, role, initials, phone, dept, designation, twofa)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'name', u.email),
  coalesce(u.raw_user_meta_data ->> 'role', 'Viewer'),
  coalesce(
    u.raw_user_meta_data ->> 'initials',
    upper(left(coalesce(u.raw_user_meta_data ->> 'name', u.email), 2))
  ),
  u.raw_user_meta_data ->> 'phone',
  coalesce(u.raw_user_meta_data ->> 'dept', 'Drilling Fluids'),
  u.raw_user_meta_data ->> 'designation',
  coalesce((u.raw_user_meta_data ->> 'twofa')::boolean, false)
from auth.users u
on conflict (id) do nothing;
