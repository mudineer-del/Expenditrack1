-- OGDCL Invoice Tracker — Well Cost module: daily remarks
--
-- Adds a `remarks` column to well_cost_transactions so a day's cost entry can carry the
-- drilling/operations narrative that explains it (e.g. "stuck pipe — spotted lube pill"),
-- not just its dollar amount. Populated automatically on import (see dmrImport.ts's
-- extractRemarks(), which reads the WBM sheet's "REMARKS AND TREATMENT" / "REMARKS" blocks),
-- and editable by hand for manually-logged entries too. Safe to re-run (idempotent).

alter table public.well_cost_transactions add column if not exists remarks text;
