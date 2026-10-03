-- Organisers can delete a registration (row + photo) from the dashboard.
-- Deleting a row frees its jersey number. Nobody else can delete. Safe to run more than once.

grant delete on table public.player_registrations to authenticated;

drop policy if exists "Organisers can delete registrations" on public.player_registrations;
create policy "Organisers can delete registrations"
  on public.player_registrations
  for delete
  to authenticated
  using ((select public.is_organiser()));

drop policy if exists "Organisers can delete player photos" on storage.objects;
create policy "Organisers can delete player photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'player-photos' and (select public.is_organiser()));
