-- ============================================================
-- activity_events — lightweight product-analytics event stream.
--
-- Written fire-and-forget from the client tracker (src/lib/
-- activity-tracker.ts): page views + key actions (sign-in, sign-up,
-- reservations, waitlist joins, newsletter signups, concierge
-- inquiries, channel-message counts, RSVPs, agreement signatures).
-- No message contents are ever stored — counts + ids only.
--
-- Anyone (including anonymous visitors) may INSERT, lightly
-- validated; only the app admin may read — the stream exists solely
-- to power /community/admin/analytics. Mirrors the public-insert /
-- admin-read pattern of concierge-inquiries.sql.
--
-- Retention: events are immutable (no UPDATE policy) and admin-
-- deletable. Prune from the SQL editor (or a scheduled job later):
--   delete from public.activity_events where created_at < now() - interval '180 days';
-- ============================================================

create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  path        text,
  user_id     text,
  session_id  text not null default '',
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_events_created_idx on public.activity_events (created_at desc);
create index if not exists activity_events_user_idx    on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_type_idx    on public.activity_events (type, created_at desc);

alter table public.activity_events enable row level security;

-- Public submit (the tracker runs for signed-out visitors too), with
-- size caps so the open insert can't be abused to store blobs.
drop policy if exists activity_events_insert on public.activity_events;
create policy activity_events_insert on public.activity_events
  for insert to anon, authenticated with check (
    char_length(type) > 0
    and char_length(type) <= 40
    and (path is null or char_length(path) <= 500)
    and char_length(session_id) <= 80
    and (user_id is null or char_length(user_id) <= 128)
  );

-- Admin-only read: the stream is an internal analytics surface.
drop policy if exists activity_events_select on public.activity_events;
create policy activity_events_select on public.activity_events
  for select to authenticated using ((select public.is_app_admin()));

-- No UPDATE policy on purpose — recorded events are immutable.

-- Admin delete = the retention/pruning hook (see header).
drop policy if exists activity_events_delete on public.activity_events;
create policy activity_events_delete on public.activity_events
  for delete to authenticated using ((select public.is_app_admin()));

-- Realtime for the live admin feed (matches enable-realtime.sql; the
-- dashboard also reconcile-polls, so this is best-effort).
alter table public.activity_events replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.activity_events;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
