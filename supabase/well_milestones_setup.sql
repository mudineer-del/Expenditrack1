-- OGDCL Invoice Tracker — Well Cost module: well drilling data / milestones
--
-- Run once in the Supabase SQL Editor. Adds a per-well list of drilling milestones
-- (spud date, casing points, section TDs, or anything else worth tracking planned vs.
-- actual for) so cost can be read alongside WHEN/HOW DEEP things actually happened, not
-- just how much they cost — surfaced via the "Well Data" button on the Well Cost Summary
-- card. Deliberately a free-form label + planned/actual date + planned/actual depth per
-- row, rather than fixed columns for "spud"/"20in casing"/etc., since every well's actual
-- casing program differs. Safe to re-run (idempotent).

create table if not exists public.well_milestones (
  id uuid primary key default gen_random_uuid(),
  well_id uuid not null references public.wells(id) on delete cascade,
  label text not null,
  planned_date date,
  actual_date date,
  planned_depth numeric,
  actual_depth numeric,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists well_milestones_well_idx on public.well_milestones(well_id);

alter table public.well_milestones enable row level security;

-- Same write tier as well_cost_transactions (public.is_editor_or_admin(), defined in
-- well_cost_setup.sql) — actual dates/depths get filled in as drilling progresses, day to
-- day, same cadence as cost postings, not a one-time structural setup like cost centres.
drop policy if exists "well_milestones_select" on public.well_milestones;
create policy "well_milestones_select" on public.well_milestones for select using (true);
drop policy if exists "well_milestones_insert" on public.well_milestones;
create policy "well_milestones_insert" on public.well_milestones for insert with check (public.is_editor_or_admin());
drop policy if exists "well_milestones_update" on public.well_milestones;
create policy "well_milestones_update" on public.well_milestones for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
drop policy if exists "well_milestones_delete" on public.well_milestones;
create policy "well_milestones_delete" on public.well_milestones for delete using (public.is_admin());
