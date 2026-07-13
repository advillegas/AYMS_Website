-- ============================================================
-- Event sync tombstones.
--
-- When the admin deletes (or hand-edits) an event that came from an
-- iCal feed, its feed UID is appended to suppressed_uids on the owning
-- calendar_sync_configs row. /api/calendar/sync skips suppressed UIDs
-- when upserting, so deleted synced events can never resurrect.
--
-- The client + sync route tolerate this column being absent (they read
-- it defensively), but suppression only PERSISTS on the Supabase
-- backend once this has been applied.
--
-- Apply: node scripts/apply-sql.mjs supabase/events-suppression.sql
--        (needs SUPABASE_PAT + SUPABASE_REF env vars)
-- ============================================================

alter table public.calendar_sync_configs
  add column if not exists suppressed_uids jsonb not null default '[]'::jsonb;
