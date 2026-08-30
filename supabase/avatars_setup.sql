-- OGDCL Invoice Tracker — profile photos
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query),
-- after profiles_setup.sql. Safe to re-run.
--
-- Adds an avatar_url column to profiles, plus a public "avatars" storage bucket where
-- each user may only write inside their own folder (named after their user id). Read
-- access is public — same as virtually every avatar CDN (Slack, GitHub, Gravatar) — since
-- a photo URL keyed by an opaque user id isn't a meaningful secret, and the app already
-- needs every signed-in user to see every other user's avatar in shared UI (message
-- threads, the Users page).

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Admins may also set/replace/remove any user's photo (e.g. from the Users page) —
-- these are additional, OR'd-together policies alongside the owner ones above, using
-- the same public.is_admin() helper profiles_setup.sql already defines.
drop policy if exists "avatars_admin_write" on storage.objects;
create policy "avatars_admin_write" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "avatars_admin_update" on storage.objects;
create policy "avatars_admin_update" on storage.objects
  for update
  using (bucket_id = 'avatars' and public.is_admin());

drop policy if exists "avatars_admin_delete" on storage.objects;
create policy "avatars_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'avatars' and public.is_admin());
