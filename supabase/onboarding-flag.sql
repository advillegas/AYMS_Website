-- Per-user onboarding flag so the welcome journey + community tour show ONCE
-- per member (cross-device), instead of relying on browser-global localStorage.
-- New members default to false (they see it once); every existing member is
-- backfilled to true so they're never nagged again.

alter table public.users
  add column if not exists onboarded boolean not null default false;

alter table public.users
  add column if not exists tour_done boolean not null default false;

-- Backfill: everyone who already exists has effectively been onboarded.
update public.users set onboarded = true where onboarded = false;
update public.users set tour_done = true where tour_done = false;

notify pgrst, 'reload schema';
select 'ok' as r;
