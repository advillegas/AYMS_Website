-- ============================================================
-- Site editor (CMS) tables — rebuild of the visual page builder.
--
-- Mirrors the legacy Firestore layout:
--   cms_pages      ← cmsPages/{slug}     (one row per page)
--   cms_config     ← cmsConfig/{key}     (nav lives at key='nav')
--   cms_templates  ← cmsTemplates/{id}   (saved block templates)
--
-- Elements are stored as JSONB (BuilderElement[]). TEXT ids/slugs to
-- match the app's id model. RLS enabled + permissive to match the rest
-- of the Supabase backend (test-mode posture; HARDEN before launch —
-- writes should be admin/manageContent-only once Supabase Auth is wired).
-- ============================================================

create table if not exists public.cms_pages (
  slug          text primary key,
  title         text not null default '',
  elements      jsonb not null default '[]'::jsonb,
  is_published  boolean not null default false,
  is_system     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.cms_config (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.cms_templates (
  id          text primary key,
  name        text not null default '',
  elements    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS: enable + permissive (mirrors existing tables during dual-run).
do $$
declare t text;
begin
  foreach t in array array['cms_pages','cms_config','cms_templates']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I replica identity full;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_write', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_all_read', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all_write', t);
    -- Realtime
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
