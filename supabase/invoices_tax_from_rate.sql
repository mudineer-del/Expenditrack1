-- One-off repair of invoice tax, run once in the Supabase SQL Editor.
--
-- Imports used to take a zero Tax column as the tax, so some rows had a GST/PST rate but no tax,
-- and their inclusive total equalled the excl total. This sets tax from the rate, then makes the
-- inclusive total equal excl + tax wherever it differs. Rows without a rate are left alone.
-- The app runs the same logic once per browser (src/lib/migrations.ts, migration_taxFromRate2026),
-- so this is only needed to correct everything at once.

begin;

update invoices
set tax = round(amount_excl_tax * gst_pst, 2)
where coalesce(tax, 0) = 0
  and coalesce(gst_pst, 0) > 0
  and coalesce(amount_excl_tax, 0) > 0;

update invoices
set amount_incl_tax = round(coalesce(amount_excl_tax, 0) + coalesce(tax, 0), 2)
where abs(coalesce(amount_incl_tax, 0) - (coalesce(amount_excl_tax, 0) + coalesce(tax, 0))) > 0.005;

commit;
