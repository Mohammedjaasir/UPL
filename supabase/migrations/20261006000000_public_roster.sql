-- Public player list (/players): anyone can see each registered player's
-- photo, name, village, role, batting style and jersey name/number.
-- WhatsApp numbers, dates of birth and jersey sizes stay private.
-- The registrations table itself is still unreadable for the public. Safe to run more than once.

-- Only these columns ever leave the database for the public list.
create or replace function public.get_public_roster()
returns table (
  id            uuid,
  full_name     text,
  village       text,
  playing_role  text,
  batting_style text,
  jersey_name   text,
  jersey_number smallint,
  photo_path    text,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.full_name, r.village, r.playing_role, r.batting_style,
         r.jersey_name, r.jersey_number, r.photo_path, r.created_at
  from public.player_registrations r
  order by r.full_name;
$$;

revoke all on function public.get_public_roster() from public;
grant execute on function public.get_public_roster() to anon, authenticated;

-- Photos are shown publicly, so serve them by direct link.
-- Paths are random ids that only appear through the function above; the bucket
-- still cannot be listed, and uploads/deletes keep their existing rules.
update storage.buckets set public = true where id = 'player-photos';
