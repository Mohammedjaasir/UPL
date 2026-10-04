-- Organisers can edit a registration from the dashboard (details and photo).
-- Nobody else can change registrations. Safe to run more than once.

grant update on table public.player_registrations to authenticated;

drop policy if exists "Organisers can edit registrations" on public.player_registrations;
create policy "Organisers can edit registrations"
  on public.player_registrations
  for update
  to authenticated
  using ((select public.is_organiser()))
  with check ((select public.is_organiser()));
