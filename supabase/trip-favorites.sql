-- Trip favorites ("saved" trips). One row per user per trip. The row is
-- both the "saved" flag (heart) and the email-subscription intent: when the
-- owner connects an ESP, this table is the list of who wants updates about a
-- trip. Mirrors the trip_reservations RLS pattern.

create table if not exists public.trip_favorites (
  user_id    text not null,
  trip_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create index if not exists trip_favorites_trip_idx on public.trip_favorites (trip_id);

alter table public.trip_favorites enable row level security;

-- Anyone signed in can read (admin roster + dedupe); writes are owner-scoped.
drop policy if exists trip_favorites_select on public.trip_favorites;
create policy trip_favorites_select on public.trip_favorites
  for select to authenticated using (true);

drop policy if exists trip_favorites_insert on public.trip_favorites;
create policy trip_favorites_insert on public.trip_favorites
  for insert to authenticated
  with check (user_id = (select public.current_app_user_id()));

drop policy if exists trip_favorites_delete on public.trip_favorites;
create policy trip_favorites_delete on public.trip_favorites
  for delete to authenticated using (
    user_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

-- Realtime (guarded so re-running doesn't error if already a member).
do $$
begin
  begin
    alter publication supabase_realtime add table public.trip_favorites;
  exception when duplicate_object then null;
  end;
end $$;

notify pgrst, 'reload schema';
select 'ok' as r;
