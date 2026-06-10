-- ============================================================
-- AYMS — Supabase (Postgres) schema mirroring the Firestore data model.
--
-- Strategy: typed columns for the hot query paths (ids, channel_id,
-- participant_ids, created_at) + JSONB for nested / variable shapes
-- (reactions, polls, attachments, lastMessage, manualLocations, ...).
-- The three Firestore `config/*` singleton docs (roles, userRoles,
-- channels) are promoted to real relational tables.
--
-- IDs are TEXT to preserve the exact Firestore document IDs during
-- migration (so cross-references survive 1:1).
--
-- RLS: enabled on every table here; the hardened policy set lives in
-- supabase/policies.sql. Apply order:
--   schema.sql → policies.sql → enable-realtime.sql → storage-policies.sql
-- ============================================================

-- ---------- users (profiles + presence + geo) ----------
create table if not exists public.users (
  id                     text primary key,
  name                   text not null default '',
  email                  text not null default '',
  avatar                 text not null default '',
  bio                    text not null default '',
  location               text not null default '',
  joined_date            text,
  role                   text not null default 'amiga',  -- amiga | leader | admin
  name_display           text,                            -- full | first | initial
  dm_privacy             text,
  pronouns               text,
  headline               text,
  cover_photo            text,
  bio_long               text,
  instagram              text,
  tiktok                 text,
  twitter                text,
  linkedin               text,
  website                text,
  interests              jsonb default '[]'::jsonb,
  languages              jsonb default '[]'::jsonb,
  top_friend_ids         jsonb default '[]'::jsonb,
  gallery_photos         jsonb default '[]'::jsonb,
  email_visibility       text,
  profile_visibility     text,
  geo_lat                double precision,
  geo_lng                double precision,
  manual_locations       jsonb default '[]'::jsonb,
  local_radius_miles     integer,
  event_radius_miles     integer,
  local_chat_visibility  text,
  status                 text,                            -- online | away | offline
  manual_override        boolean default false,
  last_active_at         timestamptz,
  geo_updated_at         timestamptz,
  created_at             timestamptz not null default now(),
  raw                    jsonb default '{}'::jsonb         -- catch-all for any extra fields
);

-- ---------- messages (channel chat, threads, polls, posts) ----------
create table if not exists public.messages (
  id                       text primary key,
  channel_id               text not null,
  user_id                  text not null,
  user_name                text not null default '',
  user_avatar              text not null default '',
  content                  text not null default '',
  attachments              jsonb default '[]'::jsonb,
  reactions                jsonb default '{}'::jsonb,
  poll                     jsonb,
  thread_parent_id         text,
  thread_count             integer not null default 0,
  is_post                  boolean not null default false,
  post_title               text,
  post_body                text,
  post_media               jsonb default '[]'::jsonb,
  msg_lat                  double precision,
  msg_lng                  double precision,
  author_local_visibility  text,
  created_at               timestamptz not null default now(),
  edited_at                timestamptz
);
create index if not exists messages_channel_created_idx on public.messages (channel_id, created_at);
create index if not exists messages_thread_parent_idx   on public.messages (thread_parent_id);
create index if not exists messages_user_idx            on public.messages (user_id);

-- ---------- conversations (DMs + group chats) ----------
create table if not exists public.conversations (
  id               text primary key,
  type             text not null default 'dm',  -- dm | group
  participant_ids  text[] not null default '{}',
  created_by       text not null default '',
  name             text,
  last_message     jsonb,
  read_at          jsonb default '{}'::jsonb,    -- { userId: iso }
  typing           jsonb default '{}'::jsonb,    -- { userId: iso }
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists conversations_participants_idx on public.conversations using gin (participant_ids);
create index if not exists conversations_updated_idx      on public.conversations (updated_at desc);

-- ---------- conversation_messages (DM message subcollection) ----------
create table if not exists public.conversation_messages (
  id                text primary key,
  conversation_id   text not null references public.conversations (id) on delete cascade,
  user_id           text not null,
  user_name         text not null default '',
  user_avatar       text not null default '',
  content           text not null default '',
  attachments       jsonb default '[]'::jsonb,
  reactions         jsonb default '{}'::jsonb,
  thread_parent_id  text,
  thread_count      integer not null default 0,
  created_at        timestamptz not null default now(),
  edited_at         timestamptz
);
create index if not exists conv_messages_conv_created_idx on public.conversation_messages (conversation_id, created_at);
create index if not exists conv_messages_thread_idx       on public.conversation_messages (thread_parent_id);

-- ---------- friendships ----------
create table if not exists public.friendships (
  id               text primary key,
  participant_ids  text[] not null default '{}',
  requester_id     text not null,
  recipient_id     text not null,
  status           text not null default 'pending',  -- pending | accepted
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz
);
create index if not exists friendships_participants_idx on public.friendships using gin (participant_ids);

-- ---------- roles (was config/roles) ----------
create table if not exists public.roles (
  id           text primary key,
  name         text not null,
  color        text not null default '#888888',
  priority     integer not null default 0,
  permissions  jsonb not null default '[]'::jsonb,
  system       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------- user_roles (was config/userRoles map) ----------
create table if not exists public.user_roles (
  user_id  text not null,
  role_id  text not null,
  primary key (user_id, role_id)
);
create index if not exists user_roles_role_idx on public.user_roles (role_id);

-- ---------- channels (was config/channels) ----------
create table if not exists public.channels (
  id                   text primary key,
  name                 text not null,
  description          text not null default '',
  icon                 text not null default '#',
  category             text not null default 'general',
  type                 text not null default 'text',  -- text | voice | video
  restricted_role_ids  jsonb not null default '[]'::jsonb,
  archived             boolean not null default false,
  position             integer not null default 0,
  created_by           text,
  geo_locations        jsonb,
  geo_radius_miles     integer,
  is_geo_channel       boolean not null default false,
  created_at           timestamptz not null default now()
);
create index if not exists channels_category_position_idx on public.channels (category, position);

-- ---------- events ----------
create table if not exists public.events (
  id                  text primary key,
  title               text not null default '',
  description         text not null default '',
  date                text,            -- YYYY-MM-DD
  end_date            text,
  start_time          text,            -- HH:mm
  end_time            text,
  type                text not null default 'social',
  location            text not null default '',
  capacity            integer,
  image               text,
  published           boolean not null default true,
  source_calendar_id  text,
  source_uid          text,
  synced_at           timestamptz,
  created_by          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (date);
-- Idempotent column adds for databases provisioned before these fields
-- existed (create table if not exists won't add columns to an extant table).
alter table public.events add column if not exists capacity integer;
alter table public.events add column if not exists image text;
alter table public.events add column if not exists published boolean not null default true;

-- ---------- trips ----------
-- Live, admin-published travel offers. Mirrors the Firestore `trips`
-- collection seeded from src/lib/trips-data.ts. Only published trips render
-- on the public marketing site; drafts stay admin-only in the CRM.
create table if not exists public.trips (
  id            text primary key,
  title         text not null default '',
  destination   text not null default '',
  country       text not null default '',
  dates         text not null default '',
  duration      text not null default '',
  price         integer not null default 0,
  deposit       integer not null default 0,
  status        text not null default 'available',
  spots         integer not null default 0,
  spots_left    integer not null default 0,
  description   text not null default '',
  highlights    jsonb not null default '[]'::jsonb,
  includes      jsonb not null default '[]'::jsonb,
  not_included  jsonb not null default '[]'::jsonb,
  emoji         text not null default '',
  gradient      text not null default '',
  image         text not null default '',
  published     boolean not null default true,
  featured      boolean not null default false,
  sort_order    integer not null default 0,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists trips_order_idx on public.trips (sort_order);

-- ---------- event_comments (events/{id}/comments subcollection) ----------
-- event_id is a plain text column on purpose (NO foreign key to events):
-- the community calendar renders comments on entries that are not rows in
-- public.events — member-hosted meetups and other merged calendar sources
-- keep their own ids. Firestore allowed this (parentless subcollections),
-- so an FK here would 23503 every comment on a meetup.
create table if not exists public.event_comments (
  id           text primary key,
  event_id     text not null,
  user_id      text not null,
  user_name    text not null default '',
  user_avatar  text,
  content      text not null default '',
  created_at   timestamptz not null default now()
);
-- Idempotent patch for databases provisioned before the FK was removed.
alter table public.event_comments drop constraint if exists event_comments_event_id_fkey;
create index if not exists event_comments_event_created_idx on public.event_comments (event_id, created_at);

-- ---------- calendar_sync_configs ----------
create table if not exists public.calendar_sync_configs (
  id                     text primary key,
  name                   text not null default '',
  ical_url               text not null default '',
  sync_interval_minutes  integer not null default 30,
  last_sync_at           timestamptz,
  last_sync_error        text,
  last_sync_count        integer,
  enabled                boolean not null default true,
  created_by             text,
  created_at             timestamptz not null default now()
);

-- ---------- agreements (PandaDoc-style e-signature documents) ----------
create table if not exists public.agreements (
  id                       text primary key,
  reservation_id           text,
  trip_id                  text,
  trip_title               text not null default '',
  prospect_id              text not null default '',
  prospect_name            text not null default '',
  prospect_email           text,
  template_id              text not null default '',
  title                    text not null default '',
  body_markdown            text not null default '',
  disclosures              jsonb not null default '[]'::jsonb,
  status                   text not null default 'draft',
  admin_signer_name        text,
  admin_signature_text     text,
  admin_signed_at          timestamptz,
  prospect_signer_name     text,
  prospect_signature_text  text,
  prospect_signed_at       timestamptz,
  created_by               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists agreements_prospect_idx on public.agreements (prospect_id);
create index if not exists agreements_status_idx on public.agreements (status);

-- ---------- meetups (meetups/{autoId}) ----------
create table if not exists public.meetups (
  id           text primary key,
  title        text not null default '',
  description  text not null default '',
  date         text,            -- YYYY-MM-DD
  start_time   text,            -- HH:mm | null
  location     text not null default '',
  lat          double precision,
  lng          double precision,
  host_id      text not null,
  host_name    text not null default '',
  host_avatar  text,
  capacity     integer,
  created_at   timestamptz not null default now()
);
create index if not exists meetups_date_idx on public.meetups (date);
create index if not exists meetups_host_idx on public.meetups (host_id);

-- ---------- rsvps ----------
-- ONE table for both events/{id}/rsvps and meetups/{id}/rsvps, matching
-- the generic useRsvps(targetType, targetId) hook. The PK enforces the
-- Firestore "doc id == member uid" idempotent-toggle invariant.
create table if not exists public.rsvps (
  target_type  text not null check (target_type in ('event','meetup')),
  target_id    text not null,
  user_id      text not null,
  user_name    text not null default '',
  user_avatar  text,
  status       text not null default 'going' check (status in ('going','interested')),
  created_at   timestamptz not null default now(),
  primary key (target_type, target_id, user_id)
);
create index if not exists rsvps_user_idx on public.rsvps (user_id);

-- ---------- trip_reservations (tripReservations/{autoId}) ----------
create table if not exists public.trip_reservations (
  id           text primary key default gen_random_uuid()::text,
  trip_id      text not null,
  user_id      text not null,
  user_name    text not null default '',
  user_avatar  text,
  status       text not null default 'reserved' check (status in ('reserved','waitlist','cancelled')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists trip_reservations_trip_idx on public.trip_reservations (trip_id);
create index if not exists trip_reservations_user_idx on public.trip_reservations (user_id);

-- ---------- notifications (notifications/{uid}/items/{autoId}) ----------
-- The Firestore {uid} path segment becomes the recipient_id column.
create table if not exists public.notifications (
  id            text primary key default gen_random_uuid()::text,
  recipient_id  text not null,
  kind          text not null default 'system',
  title         text not null default '',
  body          text not null default '',
  actor_id      text,
  actor_name    text,
  actor_avatar  text,
  href          text not null default '',
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ---------- reports (member-filed moderation reports) ----------
create table if not exists public.reports (
  id                text primary key default gen_random_uuid()::text,
  target_type       text not null default 'message' check (target_type in ('message','member')),
  target_id         text not null,
  channel_id        text,
  reported_user_id  text not null default '',
  reporter_id       text not null,
  reporter_name     text,
  reason            text not null default '',
  snapshot          jsonb not null default '{}'::jsonb,   -- { content, userName }
  status            text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by       text,
  resolved_by_name  text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------- mod_actions (append-only moderation audit log) ----------
create table if not exists public.mod_actions (
  id           text primary key default gen_random_uuid()::text,
  action       text not null,
  actor_id     text not null,
  actor_name   text not null default '',
  target_id    text not null,
  target_name  text,
  reason       text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists mod_actions_created_idx on public.mod_actions (created_at desc);

-- ---------- testimonials (curated marketing quotes) ----------
create table if not exists public.testimonials (
  id          text primary key,
  name        text not null default '',
  location    text not null default '',
  trip        text not null default '',
  en          text not null default '',
  es          text not null default '',
  initials    text not null default '',
  gradient    text not null default '',
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- newsletter_signups ----------
create table if not exists public.newsletter_signups (
  id          text primary key default gen_random_uuid()::text,
  email       text not null,
  name        text,
  source      text not null default 'contact',
  trip_id     text,
  locale      text not null default 'en',
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);
-- DB-enforced de-dupe (the client dedup query is admin-only / best-effort).
create unique index if not exists newsletter_signups_email_key on public.newsletter_signups (lower(email));

-- ---------- moderation_config (config/moderation singleton, 1:1) ----------
create table if not exists public.moderation_config (
  id          text primary key default 'moderation' check (id = 'moderation'),
  bans        jsonb not null default '{}'::jsonb,   -- Record<uid, BanEntry>
  mutes       jsonb not null default '{}'::jsonb,   -- Record<uid, MuteEntry>
  updated_at  timestamptz not null default now()
);
-- Seed the singleton so readers never hit a missing row (admin upserts after).
insert into public.moderation_config (id) values ('moderation')
on conflict (id) do nothing;

-- ---------- user_badges (users/{uid}/badges/{badgeId} → {earnedAt, seen}) ----------
create table if not exists public.user_badges (
  user_id    text not null,
  badge_id   text not null,
  earned_at  timestamptz not null default now(),
  seen       boolean not null default false,
  primary key (user_id, badge_id)
);

-- ---------- passport_stamps (users/{uid}/passport/{autoId}) ----------
create table if not exists public.passport_stamps (
  id         text primary key,
  user_id    text not null,
  trip_id    text,
  country    text not null default '',
  city       text,
  label      text not null default '',
  emoji      text not null default '',
  year       integer,
  note       text,
  photo_url  text,
  added_at   timestamptz not null default now()
);
create index if not exists passport_stamps_user_idx on public.passport_stamps (user_id);

-- ============================================================
-- Identity bridge — Supabase Auth ↔ canonical app user id
--
-- The app's canonical user id is users.id (the original Firebase UID for
-- migrated members, the Supabase auth uid for new ones). auth.uid() is
-- therefore NOT comparable to row user_id columns; the helpers below do
-- the mapping. users.auth_id is backfilled on first login via the
-- security-definer link_auth_identity() RPC (email match), after which
-- the indexed auth_id path takes over.
-- ============================================================

alter table public.users add column if not exists auth_id uuid;
create unique index if not exists users_auth_id_key on public.users (auth_id) where auth_id is not null;
-- Unique on lower(email), excluding the '' default so legacy rows without
-- an email don't collide (the email fallback below ignores '' anyway).
create unique index if not exists users_email_lower_idx on public.users (lower(email)) where email <> '';

-- Canonical users.id for the current JWT: auth_id match first, then a
-- one-time email fallback for migrated members who haven't linked yet.
-- STABLE so policies can reference it as (select public.current_app_user_id())
-- and Postgres evaluates it once per statement (InitPlan), not per row.
create or replace function public.current_app_user_id()
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.users where auth_id = auth.uid() limit 1),
    (select id from public.users
       where auth_id is null
         and lower(email) = lower(auth.jwt()->>'email')
         and coalesce(auth.jwt()->>'email', '') <> ''   -- never match ''-email rows
       limit 1)
  )
$$;

-- Admin = canonical admin email on the JWT (bootstrap parity with
-- firestore.rules isAdminEmail()) OR a profile row with role 'admin'.
create or replace function public.is_app_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt()->>'email', '') = 'admin@ayms.com'
      or exists (select 1 from public.users
                  where id = public.current_app_user_id() and role = 'admin')
$$;

-- The ONLY legal client path for setting users.auth_id (a plain client
-- update would be an account-takeover vector — see users_auth_id_guard).
-- Called from resolveCanonicalUser on first login; security definer so it
-- runs as the function owner, which the guard trigger recognises.
create or replace function public.link_auth_identity()
returns text
language plpgsql security definer set search_path = public as $$
declare uid text;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'email', '') = '' then
    return null;
  end if;
  update public.users
     set auth_id = auth.uid()
   where auth_id is null
     and lower(email) = lower(auth.jwt()->>'email')
  returning id into uid;
  return coalesce(uid, public.current_app_user_id());
end $$;

-- ============================================================
-- Row Level Security — enabled on every table here; the hardened
-- per-table policies live in supabase/policies.sql (apply it right after
-- this file). Supabase Auth IS the identity provider: auth.uid()/auth.jwt()
-- are real for signed-in members, and policies compare the canonical
-- users.id via (select public.current_app_user_id()). With RLS enabled
-- and no policies, tables deny by default until policies.sql runs.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','messages','conversations','conversation_messages','friendships',
    'roles','user_roles','channels','events','event_comments','calendar_sync_configs',
    'trips','agreements','meetups','rsvps','trip_reservations','notifications',
    'reports','mod_actions','testimonials','newsletter_signups','moderation_config',
    'user_badges','passport_stamps'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ============================================================
-- Hard guards (trigger-enforced; independent of RLS/auth)
-- ============================================================

-- True when the request carries the service_role JWT (dashboard, server
-- jobs). Plain anon/authenticated app traffic is NOT service role.
create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''
  ) = 'service_role';
$$;

-- users.role is the privilege boundary. Role grants/changes are allowed
-- for the service role and for app admins (the admin members panel
-- promotes/demotes client-side); the canonical admin email may also seed
-- its OWN row with role 'admin' (bootstrap parity with firestore.rules).
-- Blocks the create-as-amiga-then-update-role-to-admin escalation —
-- is_app_admin() is evaluated against the ACTOR, not the row.
create or replace function public.guard_user_role()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() or public.is_app_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'users.role changes require an admin or the service role';
  end if;
  if tg_op = 'INSERT' and coalesce(new.role, '') = 'admin' then
    -- Admin-email bootstrap (own row only) — already covered by the
    -- is_app_admin() email branch above; kept explicit for clarity.
    if not (coalesce(auth.jwt()->>'email', '') = 'admin@ayms.com'
            and new.id = auth.uid()::text) then
      raise exception 'admin role grants require an admin or the service role';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists users_role_guard on public.users;
create trigger users_role_guard
  before insert or update on public.users
  for each row execute function public.guard_user_role();

-- users.auth_id is the identity link — a direct client UPDATE could
-- claim an existing (migrated) profile row for a different auth account
-- (account takeover). Changing it is reserved to the service role and
-- the security-definer link_auth_identity() RPC, which executes as the
-- function owner rather than the PostgREST anon/authenticated role.
-- INSERT may self-link only (new-member seed rows write their own
-- auth.uid(); users_insert RLS already pins id + email to the JWT).
create or replace function public.guard_user_auth_id()
returns trigger language plpgsql as $$
begin
  if public.is_service_role()
     or current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.auth_id is not null and new.auth_id is distinct from auth.uid() then
      raise exception 'users.auth_id may only be your own auth uid';
    end if;
    return new;
  end if;
  if new.auth_id is distinct from old.auth_id then
    raise exception 'users.auth_id is managed by link_auth_identity()';
  end if;
  return new;
end $$;

drop trigger if exists users_auth_id_guard on public.users;
create trigger users_auth_id_guard
  before insert or update on public.users
  for each row execute function public.guard_user_auth_id();

-- Agreements are legal documents: enforce the e-sign state machine and
-- make signatures write-once at the database layer, so no client (anon
-- or otherwise) can forge a transition, reopen a closed document, or
-- overwrite a recorded signature. Mirrors firestore.rules.
create or replace function public.guard_agreement()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.status = 'completed' then
      raise exception 'completed agreements cannot be deleted';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      if not (
        (old.status = 'draft' and new.status in ('sent', 'void'))
        or (old.status = 'sent' and new.status in ('prospect_signed', 'void'))
        or (old.status = 'prospect_signed' and new.status in ('completed', 'void'))
      ) then
        raise exception 'illegal agreement status transition % -> %', old.status, new.status;
      end if;
    end if;
    if old.prospect_signed_at is not null
       and new.prospect_signed_at is distinct from old.prospect_signed_at then
      raise exception 'prospect signature is immutable once set';
    end if;
    if old.admin_signed_at is not null
       and new.admin_signed_at is distinct from old.admin_signed_at then
      raise exception 'admin signature is immutable once set';
    end if;
    -- Prospect signing path (RLS already limits non-admin updates to the
    -- prospect's own agreement). Mirrors the affectedKeys().hasOnly([...])
    -- clause of firestore.rules — RLS is row-level, so the column
    -- whitelist + exact sent→prospect_signed transition live here.
    if not public.is_app_admin() then
      if new.id is distinct from old.id
         or new.reservation_id is distinct from old.reservation_id
         or new.trip_id is distinct from old.trip_id
         or new.trip_title is distinct from old.trip_title
         or new.prospect_id is distinct from old.prospect_id
         or new.prospect_name is distinct from old.prospect_name
         or new.prospect_email is distinct from old.prospect_email
         or new.template_id is distinct from old.template_id
         or new.title is distinct from old.title
         or new.body_markdown is distinct from old.body_markdown
         or new.admin_signer_name is distinct from old.admin_signer_name
         or new.admin_signature_text is distinct from old.admin_signature_text
         or new.admin_signed_at is distinct from old.admin_signed_at
         or new.created_by is distinct from old.created_by
         or new.created_at is distinct from old.created_at then
        raise exception 'prospects may only modify the signing fields';
      end if;
      if not (old.status = 'sent' and new.status = 'prospect_signed') then
        raise exception 'prospects may only sign a sent agreement';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists agreements_guard on public.agreements;
create trigger agreements_guard
  before update or delete on public.agreements
  for each row execute function public.guard_agreement();
