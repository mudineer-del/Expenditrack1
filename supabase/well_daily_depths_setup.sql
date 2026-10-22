-- OGDCL Invoice Tracker — Well Cost module: daily depth per well
--
-- Run once in the Supabase SQL Editor (safe to re-run). Adds one row per well per report
-- date with the measured depth (MD) and true vertical depth (TVD) for that day, so the
-- Cost Projection panel can plot cost against depth day by day, not only at milestones.
-- Filled in by the field entry form and by the DMR import (which reads the "Depth/TVD"
-- line from each daily report).

create table if not exists public.well_daily_depths (
  id uuid primary key default gen_random_uuid(),
  well_id uuid not null references public.wells(id) on delete cascade,
  entry_date date not null,
  depth_md numeric,
  depth_tvd numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (well_id, entry_date)
);

create index if not exists well_daily_depths_well_idx on public.well_daily_depths(well_id);

alter table public.well_daily_depths enable row level security;

-- Same tiers as well_milestones: everyone signed in can read, Editors and Admins write,
-- only Admins delete.
drop policy if exists "well_daily_depths_select" on public.well_daily_depths;
create policy "well_daily_depths_select" on public.well_daily_depths for select using (true);
drop policy if exists "well_daily_depths_insert" on public.well_daily_depths;
create policy "well_daily_depths_insert" on public.well_daily_depths for insert with check (public.is_editor_or_admin());
drop policy if exists "well_daily_depths_update" on public.well_daily_depths;
create policy "well_daily_depths_update" on public.well_daily_depths for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
drop policy if exists "well_daily_depths_delete" on public.well_daily_depths;
create policy "well_daily_depths_delete" on public.well_daily_depths for delete using (public.is_admin());
