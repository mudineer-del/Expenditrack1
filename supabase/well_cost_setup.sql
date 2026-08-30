-- OGDCL Invoice Tracker — Well Cost module
--
-- Run once in the Supabase SQL Editor, after profiles_setup.sql (this reuses
-- the public.is_admin() function that migration defines — already run if
-- Users/Activity Log/Messages work in this app, since those depend on it too).
-- Safe to re-run (idempotent). Superseded well_cost_setup.sql's first draft
-- (well_cost_items) with a properly normalized model: an admin-extensible
-- Department/Service-Category catalog, wells, and the well_departments join
-- that auto-provisions every well with the full department catalog.
--
-- well_cost_departments/well_cost_service_categories are a dedicated catalog
-- for this module — unrelated to the app's existing Invoice/Contract
-- `department` field (see src/lib/referenceLists.ts), which is a different
-- taxonomy (organizational division vs. well-construction phase).
--
-- well_cost_transactions is the daily cost/commitment ledger per cost centre —
-- see the comment above that table for why Actual/Commitments aren't plain
-- columns on well_cost_centres.

create table if not exists public.well_cost_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.well_cost_service_categories (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.well_cost_departments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  field text,
  operator text,
  status text not null default 'Planned',
  archived boolean not null default false,
  start_date date,
  description text,
  created_at timestamptz not null default now()
);

-- Auto-provisioned join: a well gets one row per existing department at creation
-- time, and adding a new department backfills a row for every existing well — this
-- is what keeps department tabs uniform across wells as the catalog grows, and is
-- what makes "every well automatically gets its own departmental cost structure" true.
create table if not exists public.well_departments (
  id uuid primary key default gen_random_uuid(),
  well_id uuid not null references public.wells(id) on delete cascade,
  department_id uuid not null references public.well_cost_departments(id) on delete cascade,
  unique (well_id, department_id)
);

-- Actual Cost and Commitments are NOT stored here — they're derived by summing
-- well_cost_transactions (see below), a dated entry log kept per cost centre so the
-- app can show how cost accrued day by day as the well progressed, not just a single
-- point-in-time number.
create table if not exists public.well_cost_centres (
  id uuid primary key default gen_random_uuid(),
  well_id uuid not null references public.wells(id) on delete cascade,
  -- No ON DELETE CASCADE on department_id/service_category_id: deleting a
  -- department/service category that still has cost centre rows is blocked
  -- by the default FK action (RESTRICT) rather than silently orphaning data.
  department_id uuid not null references public.well_cost_departments(id),
  service_category_id uuid not null references public.well_cost_service_categories(id),
  cost_centre text not null,
  fund_centre text,
  description text,
  planned_budget numeric not null default 0,
  currency text not null default 'USD',
  vendor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per dated cost/commitment posting against a cost centre — the "day in, day
-- out" ledger. A cost centre's Actual Cost = sum of its kind='actual' entries;
-- Commitments = sum of its kind='commitment' entries.
create table if not exists public.well_cost_transactions (
  id uuid primary key default gen_random_uuid(),
  cost_centre_id uuid not null references public.well_cost_centres(id) on delete cascade,
  entry_date date not null default current_date,
  kind text not null check (kind in ('actual', 'commitment')),
  amount numeric not null default 0,
  notes text,
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists well_cost_service_categories_dept_idx on public.well_cost_service_categories(department_id);
create index if not exists well_departments_well_idx on public.well_departments(well_id);
create index if not exists well_cost_centres_well_idx on public.well_cost_centres(well_id);
create index if not exists well_cost_centres_dept_idx on public.well_cost_centres(department_id);
create index if not exists well_cost_centres_service_idx on public.well_cost_centres(service_category_id);
create index if not exists well_cost_transactions_cost_centre_idx on public.well_cost_transactions(cost_centre_id);
create index if not exists well_cost_transactions_date_idx on public.well_cost_transactions(entry_date);

alter table public.well_cost_departments enable row level security;
alter table public.well_cost_service_categories enable row level security;
alter table public.wells enable row level security;
alter table public.well_departments enable row level security;
alter table public.well_cost_centres enable row level security;
alter table public.well_cost_transactions enable row level security;

-- Daily cost entries are logged far more often than budgets/wells are edited, by
-- Editors as well as Admins — a narrower write rule than every other Well Cost table
-- (which stay Admin-only), so it gets its own helper alongside public.is_admin().
create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('Admin', 'Editor')
  );
$$;

drop policy if exists "well_cost_departments_select" on public.well_cost_departments;
create policy "well_cost_departments_select" on public.well_cost_departments for select using (true);
drop policy if exists "well_cost_departments_admin_write" on public.well_cost_departments;
create policy "well_cost_departments_admin_write" on public.well_cost_departments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "well_cost_service_categories_select" on public.well_cost_service_categories;
create policy "well_cost_service_categories_select" on public.well_cost_service_categories for select using (true);
drop policy if exists "well_cost_service_categories_admin_write" on public.well_cost_service_categories;
create policy "well_cost_service_categories_admin_write" on public.well_cost_service_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wells_select" on public.wells;
create policy "wells_select" on public.wells for select using (true);
drop policy if exists "wells_admin_write" on public.wells;
create policy "wells_admin_write" on public.wells for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "well_departments_select" on public.well_departments;
create policy "well_departments_select" on public.well_departments for select using (true);
drop policy if exists "well_departments_admin_write" on public.well_departments;
create policy "well_departments_admin_write" on public.well_departments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "well_cost_centres_select" on public.well_cost_centres;
create policy "well_cost_centres_select" on public.well_cost_centres for select using (true);
drop policy if exists "well_cost_centres_admin_write" on public.well_cost_centres;
create policy "well_cost_centres_admin_write" on public.well_cost_centres for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "well_cost_transactions_select" on public.well_cost_transactions;
create policy "well_cost_transactions_select" on public.well_cost_transactions for select using (true);
drop policy if exists "well_cost_transactions_insert" on public.well_cost_transactions;
create policy "well_cost_transactions_insert" on public.well_cost_transactions for insert with check (public.is_editor_or_admin());
drop policy if exists "well_cost_transactions_update" on public.well_cost_transactions;
create policy "well_cost_transactions_update" on public.well_cost_transactions for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
drop policy if exists "well_cost_transactions_delete" on public.well_cost_transactions;
create policy "well_cost_transactions_delete" on public.well_cost_transactions for delete using (public.is_admin());

-- Seed the three default departments (idempotent — no-op if already present).
insert into public.well_cost_departments (name, sort_order)
values ('Drilling', 0), ('Completion / Stimulation', 1), ('Other / Support Services', 2)
on conflict (name) do nothing;

-- Seed the example service categories called out in the spec, keyed off the
-- department name (only inserted the first time — no unique constraint on
-- (department_id, name) exists, so this guards re-runs with a not-exists check).
insert into public.well_cost_service_categories (department_id, name, sort_order)
select d.id, s.name, s.sort_order
from public.well_cost_departments d
join (values
  ('Drilling', 'Drilling Fluids', 0),
  ('Drilling', 'Cementation', 1),
  ('Drilling', 'Directional Drilling', 2),
  ('Drilling', 'Drilling Bits', 3),
  ('Drilling', 'Mud Logging', 4),
  ('Drilling', 'Wireline Logging', 5),
  ('Drilling', 'Waste Management', 6),
  ('Drilling', 'Tubular Services', 7),
  ('Drilling', 'Rig Services', 8),
  ('Drilling', 'Other Drilling Services', 9),
  ('Completion / Stimulation', 'Stimulation', 0),
  ('Completion / Stimulation', 'Completion Fluids', 1)
) as s(dept_name, name, sort_order) on s.dept_name = d.name
where not exists (
  select 1 from public.well_cost_service_categories existing
  where existing.department_id = d.id and existing.name = s.name
);
