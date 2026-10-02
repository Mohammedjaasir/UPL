-- Fix-up for projects created after Supabase stopped auto-granting new tables
-- to the API roles: without these grants every insert from the site fails with
-- "permission denied for table player_registrations" (42501).
-- Safe to run more than once.

grant usage on schema public to anon, authenticated;

-- Insert only. No SELECT/UPDATE/DELETE: players' details stay unreadable from the browser.
grant insert on table public.player_registrations to anon, authenticated;

-- Allow "tomorrow" in UTC: Sri Lanka is UTC+5:30, so just after local midnight
-- the database's current_date is still yesterday. The site already blocks future dates.
alter table public.player_registrations
  drop constraint if exists player_registrations_date_of_birth_check;
alter table public.player_registrations
  add constraint player_registrations_date_of_birth_check
  check (date_of_birth between date '1940-01-01' and current_date + 1);

-- Make sure the photo bucket and its upload policy exist (no-op if they already do).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload a player photo" on storage.objects;
create policy "Anyone can upload a player photo"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'player-photos');
