-- OGDCL Invoice Tracker — record when each invoice was uploaded/entered
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- The hover preview on invoices shows an "Uploaded" date/time from invoices.created_at.
-- If your invoices table predates that column it won't exist, and the preview can only
-- show "Last saved" (invoices.updated_at, stamped by invoices_attribution_setup.sql).
--
-- Existing rows are backfilled from updated_at (the earliest timestamp we have for them —
-- for a never-edited invoice that IS its upload time) rather than stamped with "now",
-- which would falsely make every historical invoice look uploaded today.

alter table public.invoices
  add column if not exists created_at timestamptz;

update public.invoices
  set created_at = coalesce(updated_at, now())
  where created_at is null;

alter table public.invoices
  alter column created_at set default now(),
  alter column created_at set not null;
