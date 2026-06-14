-- ============================================================
-- Media library: a reusable catalog of uploaded images/GIFs/videos so the
-- owner can pick a previously-used file instead of re-uploading. Every CMS
-- upload records a row here; the editor's media picker reads them back.
-- Writes are open (same posture as the rest of the CMS) so saving never
-- silently fails regardless of how the owner is signed in.
-- ============================================================

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  name text,
  kind text not null default 'image',
  created_at timestamptz not null default now()
);

create index if not exists media_assets_created_idx
  on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

drop policy if exists media_assets_read on public.media_assets;
drop policy if exists media_assets_write on public.media_assets;

create policy media_assets_read on public.media_assets
  for select to anon, authenticated using (true);
create policy media_assets_write on public.media_assets
  for all to anon, authenticated using (true) with check (true);
