-- ============================================================
-- Site editor (CMS) — version history + hardened write access.
--
-- 1) cms_page_versions: a snapshot is written on every publish so a
--    bad edit can be rolled back with one click.
-- 2) RLS: keep public READ (so the live site renders) but restrict ALL
--    WRITES to app admins via public.is_app_admin(). Closes the
--    "anon can write" hole flagged in cms.sql. Verified: both admin
--    accounts are linked to Supabase Auth, so is_app_admin() is true
--    for them and the editor keeps working.
--
-- Apply: node scripts/apply-sql.mjs supabase/cms-hardening.sql
-- Reversible: re-run cms.sql to restore the permissive policies.
-- ============================================================

create table if not exists public.cms_page_versions (
  id          text primary key,
  slug        text not null,
  title       text not null default '',
  elements    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists cms_page_versions_slug_idx
  on public.cms_page_versions (slug, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['cms_pages','cms_config','cms_templates','cms_page_versions']
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Drop every prior policy variant so this file is idempotent.
    execute format('drop policy if exists %I on public.%I;', t || '_all_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_write', t);
    execute format('drop policy if exists %I on public.%I;', t || '_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_admin_write', t);
    -- Public read: the marketing site renders published pages for everyone.
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_read', t);
    -- Admin-only write: insert/update/delete require an authenticated app admin.
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());',
      t || '_admin_write', t);
  end loop;
end $$;
