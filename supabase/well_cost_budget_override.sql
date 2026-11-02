-- OGDCL Invoice Tracker: Well Cost module, budget override per cost / fund centre
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- A cost centre's budget comes from its well's AFE, split equally across its WBS group
-- (DRFD01, DRFD01/01, DRFD01/02 ...). budget_override holds a budget typed directly into
-- that centre's dialog. Blank (null) means no override, so the AFE share is used.
-- planned_budget keeps the hand-entered value, used when the well has no AFE line.

alter table public.well_cost_centres add column if not exists budget_override numeric;

-- Make the API pick up the new column straight away.
notify pgrst, 'reload schema';

-- Description override, same rule as the budget override: a description typed on the
-- centre wins, else the matching AFE WBS line's description, else the hand-entered one
-- kept in description.
alter table public.well_cost_centres add column if not exists description_override text;

notify pgrst, 'reload schema';
