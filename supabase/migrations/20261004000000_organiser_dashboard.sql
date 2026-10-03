-- Organiser dashboard (/admin): signed-in organisers can read registrations and photos.
-- Everyone else, including the public registration site and any other signed-in
-- account, still cannot read anything. Safe to run more than once.
--
-- After running this, add each organiser:
--   1. Authentication > Users > Add user (email + password, auto-confirm)
--   2. insert into public.organisers (user_id)
--        select id from auth.users where email = 'organiser@example.com'
--        on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Organiser allowlist
-- ---------------------------------------------------------------------------

create table if not exists public.organisers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organisers enable row level security;

-- An organiser may see their own row (the dashboard uses this to check access).
drop policy if exists "Organisers can see themselves" on public.organisers;
create policy "Organisers can see themselves"
  on public.organisers
  for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.organisers to authenticated;

-- Single place that answers "is the current user an organiser?".
-- security definer so policies elsewhere can call it without recursion.
create or replace function public.is_organiser()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.organisers where user_id = (select auth.uid()));
$$;

revoke all on function public.is_organiser() from public;
grant execute on function public.is_organiser() to authenticated;

-- ---------------------------------------------------------------------------
-- Read access for organisers
-- ---------------------------------------------------------------------------

grant select on table public.player_registrations to authenticated;

drop policy if exists "Organisers can read registrations" on public.player_registrations;
create policy "Organisers can read registrations"
  on public.player_registrations
  for select
  to authenticated
  using ((select public.is_organiser()));

-- Signed photo links for the dashboard.
drop policy if exists "Organisers can view player photos" on storage.objects;
create policy "Organisers can view player photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'player-photos' and (select public.is_organiser()));
