-- OGDCL Invoice Tracker — personal Dashboard layout (chart types, colors, sizing, ...)
--
-- Run once in the Supabase SQL Editor. One row per user, holding the same preference
-- object the Settings > Format dialog / Dashboard "Save Layout" button already builds
-- (colors, card scale, chart types, per-slot chart config, table style — everything
-- src/store/useDisplayStore.ts persists locally). Previously that store was ONLY saved to
-- the browser's own localStorage, so a chart-type choice never followed a user to another
-- device/browser and (with an explicit Save model) a never-saved local tweak doesn't
-- survive a reload either — this table is what "Save Layout" writes to and what every
-- login re-hydrates from. Safe to re-run (idempotent).

create table if not exists public.dashboard_layouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_layouts enable row level security;

-- Strictly personal — a user can only ever see/write their own saved layout.
drop policy if exists "dashboard_layouts_own" on public.dashboard_layouts;
create policy "dashboard_layouts_own" on public.dashboard_layouts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
