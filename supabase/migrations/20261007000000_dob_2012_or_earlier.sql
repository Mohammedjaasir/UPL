-- League rule: players must be born in 2012 or earlier.
-- Enforced here too, so registrations cannot bypass the website's check.
-- NOT VALID: applies to every new or changed registration, without failing on
-- rows that already exist (e.g. an earlier test entry). Safe to run more than once.

alter table public.player_registrations
  drop constraint if exists player_registrations_date_of_birth_check;

alter table public.player_registrations
  add constraint player_registrations_date_of_birth_check
  check (date_of_birth between date '1940-01-01' and date '2012-12-31')
  not valid;
