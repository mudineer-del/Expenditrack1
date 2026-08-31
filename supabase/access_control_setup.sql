-- OGDCL Invoice Tracker — sign-up approval gate + department/area access control
--
-- Run once in the Supabase SQL Editor, after profiles_setup.sql and
-- departments_setup.sql. Safe to re-run (idempotent).
--
-- Three things ship together here:
--   1. profiles.status — new sign-ups start 'pending' and see nothing until an
--      Admin flips them to 'active' (or 'disabled' to lock an account out again).
--      Every profile that already exists is grandfathered to 'active' so this
--      migration can never lock out someone who already had access.
--   2. profile_departments / profile_areas — per-user grants an Admin assigns at
--      approval time (or later). "area" gates which sidebar sections/routes a
--      user can open at all — the values are the same route-path strings
--      HIDEABLE_NAV_ITEMS already uses in src/components/shell/AppSidebar.tsx
--      (e.g. "/invoices", "/well-cost/wells"), so the two systems can't drift.
--   3. can_access_department() / can_write_department() / can_delete_department()
--      and the RESTRICTIVE policies on invoices/contracts that call them —
--      this is department-boundary system your Supabase project already had
--      running live (built directly against the dashboard, never checked into
--      this repo until now). This migration's job here is just to capture it
--      in git and extend it to recognize profile_departments (it previously
--      only trusted the single-valued legacy profiles.dept column, and didn't
--      require status = 'active' — see the "Fixed" comments below for exactly
--      what that gap was and why).
--
-- Admins bypass all of it — role = 'Admin' always short-circuits both the
-- department checks and app-side area checks, same as every other admin-bypass
-- in this app.
--
-- Deliberately out of scope here: Well Cost's own department taxonomy
-- (well_cost_departments — a different concept, well-construction phase rather
-- than organizational division, see the comment in well_cost_setup.sql) and
-- Messages' existing department filter. Neither is touched by this migration.

-- ---------------------------------------------------------------------------
-- 1. profiles.status
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists status text;

-- Grandfather every profile that exists right now to 'active' BEFORE the
-- 'pending' default is attached below — only sign-ups from this point on
-- start pending. Re-running is a no-op the second time (nothing left with a
-- null status to backfill).
update public.profiles set status = 'active' where status is null;

alter table public.profiles alter column status set default 'pending';
alter table public.profiles alter column status set not null;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'disabled'));

-- Extends the existing role-guard trigger (profiles_setup.sql) so a non-admin
-- can't self-approve (or re-enable a disabled account) by editing their own
-- profile — status changes require the same admin check role changes already do.
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
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only admins can change account status.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
-- (Trigger already exists and fires on every profiles update — no need to
-- re-create it, only the function body it calls.)

-- ---------------------------------------------------------------------------
-- 2. Per-user department grants
-- ---------------------------------------------------------------------------

create table if not exists public.profile_departments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  department text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, department)
);

alter table public.profile_departments enable row level security;

drop policy if exists "profile_departments_select" on public.profile_departments;
create policy "profile_departments_select" on public.profile_departments
  for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "profile_departments_admin_write" on public.profile_departments;
create policy "profile_departments_admin_write" on public.profile_departments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Per-user area (sidebar section / route) grants
-- ---------------------------------------------------------------------------

create table if not exists public.profile_areas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  area text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, area)
);

alter table public.profile_areas enable row level security;

drop policy if exists "profile_areas_select" on public.profile_areas;
create policy "profile_areas_select" on public.profile_areas
  for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "profile_areas_admin_write" on public.profile_areas;
create policy "profile_areas_admin_write" on public.profile_areas
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Grandfathering backfill
-- ---------------------------------------------------------------------------
-- Without this, every existing non-admin user loses all invoice/contract
-- access and sees an empty sidebar the moment this migration runs, since the
-- two tables above start empty. Every profile that already exists keeps its
-- current single department (from profiles.dept) and every area (matching
-- today's reality, where no page-level gating exists at all). Only brand-new
-- sign-ups going forward start with zero grants until an Admin assigns them.
--
-- Note for future re-runs: like this file's other backfills, this only ever
-- ADDS a missing grant back (on conflict do nothing) — it can't tell a
-- deliberate revoke apart from "never granted." If you intentionally strip
-- every area/department from a legacy account, re-running this file will
-- restore its original grandfathered grants. Manage that account through the
-- Users page from then on rather than by re-running this migration.

insert into public.profile_departments (profile_id, department)
select id, dept from public.profiles where dept is not null
on conflict (profile_id, department) do nothing;

insert into public.profile_areas (profile_id, area)
select p.id, a.area
from public.profiles p
cross join (
  values
    ('/invoices'), ('/vendors'), ('/well-cost'), ('/well-cost/wells'),
    ('/well-cost/structure'), ('/reports'), ('/messages'), ('/activity'),
    ('/users'), ('/install')
) as a(area)
on conflict (profile_id, area) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Department-boundary functions (RESTRICTIVE policies call these)
-- ---------------------------------------------------------------------------
-- Postgres RLS ORs together every PERMISSIVE policy for a command but ANDs in
-- every RESTRICTIVE one — so these three, paired with RESTRICTIVE policies
-- below, are what actually narrow access; the PERMISSIVE baseline in section 6
-- only has to establish "must be signed in" and can otherwise stay wide open
-- without it ever widening what these three allow.
--
-- Fixed vs. the version this project already had running live: previously
-- can_access_department() only checked the legacy single-valued profiles.dept
-- column and didn't require status = 'active' at all. Two consequences of
-- that, both now closed:
--   - Every brand-new sign-up's profiles.dept defaults to 'Drilling Fluids'
--     (see profiles_setup.sql), so a never-approved 'pending' account already
--     had real invoice/contract access via direct API calls, even though the
--     app's own UI correctly showed it a locked "awaiting approval" screen.
--   - Narrowing someone from one department to another via the Users page
--     only ever wrote to the new profile_departments table, never to the old
--     profiles.dept column — so they'd gain the new department but silently
--     keep the old one too, via that stale, unrelated field.
-- profiles.dept is now purely a display label (shown in the Users table) —
-- profile_departments is the sole source of truth for access.
create or replace function public.can_access_department(p_department text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and (
        p.role = 'Admin'
        or p.dept = 'All Departments' -- legacy sentinel some accounts may still carry; harmless to keep
        or exists (
          select 1 from public.profile_departments pd
          where pd.profile_id = p.id and pd.department = p_department
        )
      )
  );
$$;

create or replace function public.can_write_department(p_department text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_department(p_department)
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Editor'));
$$;

create or replace function public.can_delete_department(p_department text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_department(p_department) and public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS on invoices / contracts — one minimal PERMISSIVE baseline (must be
--    signed in, nothing more) plus the RESTRICTIVE boundary that does the
--    real narrowing. Deliberately NOT a broad "any signed-in user can do
--    anything" policy — this repo previously had several of those, stacked
--    up over time, silently undermining every restriction layered on top of
--    them (Postgres ORs multiple PERMISSIVE policies together, so the widest
--    one always wins regardless of how narrow the others are).
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;

drop policy if exists "invoices_authenticated_baseline" on public.invoices;
create policy "invoices_authenticated_baseline" on public.invoices
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "invoices_department_boundary" on public.invoices;
create policy "invoices_department_boundary" on public.invoices
  for select using (public.can_access_department(department));

drop policy if exists "invoices_write_boundary" on public.invoices;
create policy "invoices_write_boundary" on public.invoices
  for insert with check (public.can_write_department(department));

drop policy if exists "invoices_update_boundary" on public.invoices;
create policy "invoices_update_boundary" on public.invoices
  for update
  using (public.can_write_department(department))
  with check (public.can_write_department(department));

drop policy if exists "invoices_delete_boundary" on public.invoices;
create policy "invoices_delete_boundary" on public.invoices
  for delete using (public.can_delete_department(department));

alter table public.contracts enable row level security;

drop policy if exists "contracts_authenticated_baseline" on public.contracts;
create policy "contracts_authenticated_baseline" on public.contracts
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "contracts_department_boundary" on public.contracts;
create policy "contracts_department_boundary" on public.contracts
  for select using (public.can_access_department(department));

drop policy if exists "contracts_write_boundary" on public.contracts;
create policy "contracts_write_boundary" on public.contracts
  for insert with check (public.can_write_department(department));

drop policy if exists "contracts_update_boundary" on public.contracts;
create policy "contracts_update_boundary" on public.contracts
  for update
  using (public.can_write_department(department))
  with check (public.can_write_department(department));

drop policy if exists "contracts_delete_boundary" on public.contracts;
create policy "contracts_delete_boundary" on public.contracts
  for delete using (public.can_delete_department(department));

-- ---------------------------------------------------------------------------
-- 7. Cleanup — drop this migration's own first-draft objects (superseded by
--    section 5/6 above, which adopts and fixes the department-boundary system
--    that was already live) and every older wide-open policy stacked on these
--    two tables over time. Safe to re-run: DROP ... IF EXISTS on all of it.
-- ---------------------------------------------------------------------------

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete" on public.invoices;
drop policy if exists "contracts_select" on public.contracts;
drop policy if exists "contracts_insert" on public.contracts;
drop policy if exists "contracts_update" on public.contracts;
drop policy if exists "contracts_delete" on public.contracts;
drop function if exists public.has_department_access(text);

drop policy if exists "signed-in read invoices" on public.invoices;
drop policy if exists "signed-in write invoices" on public.invoices;
drop policy if exists "signed-in update invoices" on public.invoices;
drop policy if exists "signed-in delete invoices" on public.invoices;
drop policy if exists "invoices_authenticated" on public.invoices;
drop policy if exists "signed-in read contracts" on public.contracts;
drop policy if exists "signed-in write contracts" on public.contracts;
drop policy if exists "signed-in update contracts" on public.contracts;
drop policy if exists "signed-in delete contracts" on public.contracts;
drop policy if exists "contracts_authenticated" on public.contracts;
