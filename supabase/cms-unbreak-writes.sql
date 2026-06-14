-- ============================================================
-- Un-break CMS editing for the site owner.
--
-- The earlier admin-only (is_app_admin) write policy silently rejected
-- saves from content-manager accounts that aren't strictly role=admin
-- (and any non-Supabase-session writes), leaving cms_config empty and
-- the owner's edits with no effect. Relax CMS WRITES to any
-- authenticated user (the editor UI still gates by the manageContent
-- permission); public READ stays open; anonymous WRITES stay blocked.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['cms_pages','cms_config','cms_templates','cms_page_versions']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_write', t);
    execute format('drop policy if exists %I on public.%I;', t || '_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_admin_write', t);
    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    -- Public read (the marketing site renders published content).
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_read', t);
    -- Any signed-in editor can write (anon/public is still blocked).
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_write', t);
  end loop;
end $$;
