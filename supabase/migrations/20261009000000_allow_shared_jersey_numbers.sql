-- Any player may choose any jersey number (1-99), even if another player has it:
-- players are split into teams at the auction, so two players can both wear #10.
-- The 1-99 range check stays. Safe to run more than once.

alter table public.player_registrations
  drop constraint if exists player_registrations_jersey_number_key;
