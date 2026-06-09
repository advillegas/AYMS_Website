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
-- RLS: enabled on every table with permissive policies for now, which
-- mirrors the current Firestore "test mode" posture. These MUST be
-- hardened (auth.uid()-scoped) before the public app launch — see
-- supabase/policies-hardening.todo.sql (added in the auth step).
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
create table if not exists public.event_comments (
  id           text primary key,
  event_id     text not null references public.events (id) on delete cascade,
  user_id      text not null,
  user_name    text not null default '',
  user_avatar  text,
  content      text not null default '',
  created_at   timestamptz not null default now()
);
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

-- ============================================================
-- Row Level Security — enable everywhere, permissive for now
-- (mirrors current Firestore test-mode). HARDEN BEFORE LAUNCH.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','messages','conversations','conversation_messages','friendships',
    'roles','user_roles','channels','events','event_comments','calendar_sync_configs',
    'trips','agreements'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_write', t);
    -- Permissive read for anon + authenticated.
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_all_read', t
    );
    -- Permissive write (insert/update/delete) for anon + authenticated.
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all_write', t
    );
  end loop;
end $$;
