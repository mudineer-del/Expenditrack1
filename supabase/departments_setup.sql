-- OGDCL Invoice Tracker — multi-department support
--
-- Run once in the Supabase SQL Editor, after profiles_setup.sql and
-- invoices_attribution_setup.sql. Safe to re-run (idempotent).
--
-- The picklist of department names itself lives in the existing
-- `reference_lists` table (key = "departments", same mechanism already used
-- for vendors/services/types/etc. — see src/lib/referenceLists.ts) so no new
-- table or RLS policy is needed for that. This migration only adds the
-- `department` column that invoice/contract rows are tagged with, defaulted
-- to the app's original (and only, until now) department so every existing
-- row keeps showing up exactly where it already did.

alter table public.invoices
  add column if not exists department text not null default 'Drilling Fluids';

alter table public.contracts
  add column if not exists department text not null default 'Drilling Fluids';

-- If adding a department (or any reference-list value) from the app silently does
-- nothing, it's because this table was never created — src/lib/referenceLists.ts reads
-- it, falls back to hardcoded defaults on error, and swallowed the failure, so this can
-- go unnoticed indefinitely: every "Add" in Settings -> Reference Lists (and now the
-- sidebar's department switcher) has been failing to persist all along.
create table if not exists public.reference_lists (
  key text primary key,
  values jsonb not null default '[]'::jsonb
);

alter table public.reference_lists enable row level security;

drop policy if exists "reference_lists_select" on public.reference_lists;
create policy "reference_lists_select" on public.reference_lists
  for select
  using (true);

drop policy if exists "reference_lists_admin_write" on public.reference_lists;
create policy "reference_lists_admin_write" on public.reference_lists
  for all
  using (public.is_admin())
  with check (public.is_admin());
