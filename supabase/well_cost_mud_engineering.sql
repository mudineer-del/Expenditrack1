-- OGDCL Invoice Tracker — Well Cost module: mud engineering override cost
--
-- Run once in the Supabase SQL Editor BEFORE deploying the release that includes this
-- change — the app writes override_amount on every cost centre save, so saves fail until
-- the column exists. Adds an optional override for the DRFD02/DRFC02 mud engineering
-- centres: when set, it replaces the automatic USD 550/day accrual from the well's Spud.
-- Safe to re-run (idempotent).

alter table public.well_cost_centres add column if not exists override_amount numeric;
