-- OGDCL Invoice Tracker — "who entered/last touched this invoice"
--
-- Run once in the Supabase SQL Editor, after profiles_setup.sql (reuses its
-- public.profiles table). Safe to re-run.
--
-- Adds created_by/updated_by columns to invoices, stamped server-side by a
-- trigger from the authenticated session + profiles table — never trusting
-- whatever the client's upsert payload contains, so this can't be spoofed and
-- doesn't rely on the app remembering to set it correctly on every save path
-- (bulk import, single add/edit, undo/restore all go through the same
-- upsert, so they're all covered automatically).

alter table public.invoices
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists updated_by uuid,
  add column if not exists updated_by_name text,
  add column if not exists updated_at timestamptz;

create or replace function public.stamp_invoice_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  select name into p from public.profiles where id = auth.uid();
  if TG_OP = 'INSERT' then
    new.created_by := auth.uid();
    new.created_by_name := coalesce(p.name, '');
  else
    -- An upsert's ON CONFLICT DO UPDATE path lands here even for what the
    -- app treats as "adding" a brand new row (new id, no prior row) — but
    -- since there's no OLD row in that case, TG_OP is still 'INSERT'. This
    -- branch only runs for a genuine edit of an existing row, so keep its
    -- original creator rather than overwriting it with whoever's editing now.
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
  end if;
  new.updated_by := auth.uid();
  new.updated_by_name := coalesce(p.name, '');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_invoice_actor_trigger on public.invoices;
create trigger stamp_invoice_actor_trigger
  before insert or update on public.invoices
  for each row execute function public.stamp_invoice_actor();
