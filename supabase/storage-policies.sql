-- ============================================================
-- AYMS — hardened storage policies for the `media` bucket (avatars,
-- cover photos, galleries, post media).
--
-- Apply order: schema.sql → policies.sql → enable-realtime.sql →
--              storage-policies.sql
--
-- Path contract: every member upload carries the CANONICAL app user id
-- (users.id, NOT auth.uid()) as the second path segment —
--   avatars/{canonicalId}/<file>   posts/{canonicalId}/<file>
--   covers/{canonicalId}/<file>    gallery/{canonicalId}/<file>
-- so inserts are owner-scoped via public.current_app_user_id().
-- The migration script's `migrated/` prefix is unreachable for
-- `authenticated` and only writable by service_role (bypasses RLS).
--
-- Size + MIME caps live on the BUCKET, not in policies (Supabase has no
-- per-policy size/contentType predicates like Firebase storage.rules);
-- Firebase's per-path caps (5MB avatars / 8MB covers / 10MB gallery+posts)
-- collapse to one 10MB bucket-level cap.
-- ============================================================

-- Bucket provisioning (idempotent). 50MB cap accommodates short site-editor
-- video clips; large videos should be embedded via YouTube/Vimeo URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

-- Enforce the caps on buckets provisioned before this file existed.
update storage.buckets
   set public = true,
       file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif',
                                  'video/mp4','video/webm','video/quicktime']
 where id = 'media';

-- Drop the old wide-open policies (and prior versions of the new ones).
drop policy if exists "media_public_read" on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;
drop policy if exists "media_member_insert" on storage.objects;
drop policy if exists "media_owner_delete" on storage.objects;

-- NO select policy on purpose: the bucket is public, so objects are served
-- via their public URLs (/object/public/media/...) without one — but the
-- storage list API stays blocked, so clients cannot enumerate the bucket.
-- (The app never calls storage list; it stores full URLs in rows.)

-- Members upload only into their own folder of the app prefixes. `cms`
-- carries site-editor media (photos / GIFs / short videos); like the other
-- prefixes it is owner-scoped so the uploader can only write under their own
-- canonical id. (Publishing the page itself stays gated by the cms_pages
-- table RLS / the manageContent permission in the app.)
create policy "media_member_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in ('avatars','posts','covers','gallery','cms')
    and (storage.foldername(name))[2] = (select public.current_app_user_id())
  );

-- The app never overwrites (upsert: false in supabase-storage.ts) → no
-- UPDATE policy on purpose.

-- Delete: the uploader (owner_id = the auth uid that uploaded) or an
-- admin. Objects copied in by the migration script (service_role) have no
-- owner and are admin-managed.
create policy "media_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'media'
    and (owner_id = (select auth.uid()::text) or (select public.is_app_admin()))
  );
