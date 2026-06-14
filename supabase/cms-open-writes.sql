-- ============================================================
-- Guarantee the site owner can save edits.
--
-- The admin login only "best-effort" bridges to a Supabase session, so the
-- editor often writes as anon — which the authenticated-only policy blocked,
-- leaving every save silently failing. Restore fully-open CMS writes (the
-- pre-hardening test-mode posture) so editing works regardless of how the
-- owner is signed in. Re-harden later via a service-role server route.
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
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_write', t);
  end loop;
end $$;
