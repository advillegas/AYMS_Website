-- Permissive storage policies for the `media` bucket (avatars, cover
-- photos, galleries, post media). Mirrors the current Firebase Storage
-- test posture: public read, open write. HARDEN before launch (scope
-- inserts/updates to auth.uid()-owned paths).

do $$
begin
  -- public read
  begin
    create policy "media_public_read" on storage.objects
      for select to anon, authenticated using (bucket_id = 'media');
  exception when duplicate_object then null; end;

  -- open insert
  begin
    create policy "media_insert" on storage.objects
      for insert to anon, authenticated with check (bucket_id = 'media');
  exception when duplicate_object then null; end;

  -- open update (upsert overwrites)
  begin
    create policy "media_update" on storage.objects
      for update to anon, authenticated using (bucket_id = 'media') with check (bucket_id = 'media');
  exception when duplicate_object then null; end;

  -- open delete (remove gallery photos, etc.)
  begin
    create policy "media_delete" on storage.objects
      for delete to anon, authenticated using (bucket_id = 'media');
  exception when duplicate_object then null; end;
end $$;
