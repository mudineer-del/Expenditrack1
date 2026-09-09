-- OGDCL Invoice Tracker — Message Centre realtime delivery
--
-- Run once in the Supabase SQL Editor, after messages_setup.sql. Adds the
-- `messages` table to Supabase's realtime publication so INSERTs push to
-- connected clients over websocket instead of only showing up on the next
-- 10-second poll — what makes the "pop up the instant it's sent, while
-- you're online" behavior possible (see src/components/shell/MessageNotifier.tsx).
-- Realtime's postgres_changes still enforces messages_setup.sql's own RLS
-- per subscriber, so this doesn't loosen who can see what — a guarded DO
-- block since re-adding an already-subscribed table errors instead of
-- no-opping. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
