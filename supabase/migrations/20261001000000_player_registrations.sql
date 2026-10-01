-- Miella Super League — player registrations
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- Security model: the website uses the public anon key and may only INSERT.
-- Nobody can read, change or delete registrations from the browser; organisers
-- view them in the Supabase dashboard (or with the service-role key, server-side).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.player_registrations (
  id              uuid primary key,
  created_at      timestamptz not null default now(),

  full_name       text not null
                  check (char_length(full_name) between 2 and 60),
  date_of_birth   date not null
                  check (date_of_birth between date '1940-01-01' and current_date),
  village         text not null
                  check (village in ('miella', 'kirinda', 'yagasmulla')),
  whatsapp_number text not null
                  check (whatsapp_number ~ '^\+947[0-8][0-9]{7}$'),

  playing_role    text not null
                  check (playing_role in ('batsman', 'bowler', 'all_rounder', 'wicket_keeper')),
  batting_style   text not null
                  check (batting_style in ('right', 'left')),

  jersey_size     text not null
                  check (jersey_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  jersey_name     text not null
                  check (jersey_name ~ '^[A-Z][A-Z .''-]{0,11}$'),
  jersey_number   smallint not null
                  check (jersey_number between 1 and 99),

  -- Object path inside the private "player-photos" bucket.
  photo_path      text not null,

  constraint player_registrations_jersey_number_key unique (jersey_number)
);

comment on table public.player_registrations is 'Player registrations submitted from the MSL registration site.';

alter table public.player_registrations enable row level security;

drop policy if exists "Anyone can submit a registration" on public.player_registrations;
create policy "Anyone can submit a registration"
  on public.player_registrations
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT / UPDATE / DELETE policies: those are denied for anon by RLS.

-- ---------------------------------------------------------------------------
-- Photo storage (private bucket, 5 MB, images only)
-- ---------------------------------------------------------------------------

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
