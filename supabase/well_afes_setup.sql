-- OGDCL Invoice Tracker — Well Cost module: Authorization for Expenditure (AFE)
--
-- Run once in the Supabase SQL Editor. Adds a per-well list of AFEs: one header per AFE
-- (number, type, status, approval limit) plus its cost lines (cost code, category,
-- description, estimate, contingency) stored as jsonb, since an AFE's lines always travel
-- with the AFE and are never queried on their own. Surfaced via the "AFE" button beside
-- "Add Department" on the Well Cost Structure page. Safe to re-run (idempotent).

create table if not exists public.well_afes (
  id uuid primary key default gen_random_uuid(),
  well_id uuid not null references public.wells(id) on delete cascade,
  afe_no text not null,
  afe_type text not null default 'Initial',
  status text not null default 'Draft',
  prepared_on date,
  approved_on date,
  approval_limit numeric,
  currency text not null default 'PKR',
  preferred_currency text not null default 'USD',
  conversion_rate numeric,
  converted boolean not null default false,
  notes text,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For tables created before the preferred currency and conversion rate existed. Also moves
-- the default AFE currency to PKR. Safe to re-run.
alter table public.well_afes add column if not exists preferred_currency text not null default 'USD';
alter table public.well_afes add column if not exists conversion_rate numeric;
alter table public.well_afes alter column currency set default 'PKR';
alter table public.well_afes add column if not exists converted boolean not null default false;

create index if not exists well_afes_well_idx on public.well_afes(well_id);
create unique index if not exists well_afes_well_no_idx on public.well_afes(well_id, afe_no);

alter table public.well_afes enable row level security;

-- Same write tier as well_milestones (public.is_editor_or_admin(), defined in
-- well_cost_setup.sql): Editors and Admins can draft and update AFEs, only Admins delete.
drop policy if exists "well_afes_select" on public.well_afes;
create policy "well_afes_select" on public.well_afes for select using (true);
drop policy if exists "well_afes_insert" on public.well_afes;
create policy "well_afes_insert" on public.well_afes for insert with check (public.is_editor_or_admin());
drop policy if exists "well_afes_update" on public.well_afes;
create policy "well_afes_update" on public.well_afes for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
drop policy if exists "well_afes_delete" on public.well_afes;
create policy "well_afes_delete" on public.well_afes for delete using (public.is_admin());
