-- OGDCL Invoice Tracker — Message Centre (team channel + direct messages)
--
-- Run this once in the Supabase SQL Editor, after profiles_setup.sql (reuses
-- its public.is_admin() function and public.profiles table). Safe to re-run.
--
-- Shape: one table serves both surfaces. recipient_id is null for a channel
-- post (visible to the whole team, department-scoped client-side the same
-- way invoices/contracts already are) and set to a specific user for a
-- direct message (visible only to sender + that recipient). A trigger
-- stamps the sender's real identity from their session, so messages can't
-- be posted as someone else.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sender_name text not null default '',
  sender_role text not null default '',
  -- null = channel post (everyone signed in can read it); set = a DM,
  -- readable only by the sender and this recipient.
  recipient_id uuid references auth.users (id) on delete cascade,
  -- Only meaningful for channel posts — which department's channel this
  -- belongs to. Left null for DMs, which aren't department-scoped.
  department text,
  body text not null check (char_length(trim(body)) > 0)
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id);

alter table public.messages enable row level security;

-- Channel posts (recipient_id is null) are visible to any signed-in user —
-- department filtering happens client-side, same convention as invoices and
-- contracts. DMs are visible only to their two participants.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select
  using (
    auth.uid() is not null
    and (recipient_id is null or sender_id = auth.uid() or recipient_id = auth.uid())
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert
  with check (auth.uid() is not null);

-- Senders can retract their own message; Admins can moderate anyone's.
drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages
  for delete
  using (sender_id = auth.uid() or public.is_admin());

-- Overwrites whatever the client sent for sender_id/sender_name/sender_role
-- with the caller's real identity, so a message can't be forged as someone
-- else — same pattern as activity_log's stamp trigger.
create or replace function public.stamp_message_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  new.sender_id := auth.uid();
  select name, role into p from public.profiles where id = auth.uid();
  new.sender_name := coalesce(p.name, '');
  new.sender_role := coalesce(p.role, '');
  return new;
end;
$$;

drop trigger if exists stamp_message_sender_trigger on public.messages;
create trigger stamp_message_sender_trigger
  before insert on public.messages
  for each row execute function public.stamp_message_sender();

-- Widen profiles visibility so anyone can pick a teammate to message —
-- previously only an Admin (or the row's own owner) could read a profile,
-- which made a "who can I DM" picker impossible for Editors/Viewers. Matches
-- the precedent already set by activity_log_select: everyone signed in sees
-- the shared team roster (name/role/dept — no auth secrets live in this
-- table). Row-level write restrictions (profiles_update in
-- profiles_setup.sql) are unchanged: you still can't edit anyone else's row.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (auth.uid() is not null);
