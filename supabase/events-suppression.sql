-- ============================================================
-- Event sync tombstones — consolidated, idempotent. Safe to re-run.
--
-- When the admin deletes (or hand-edits) an event that came from an
-- iCal feed, its feed UID is appended to suppressed_uids on the owning
-- calendar_sync_configs row. /api/calendar/sync skips suppressed UIDs
-- when upserting, so deleted synced events can never resurrect.
--
-- UNTIL this file is applied the app degrades gracefully: the client
-- records tombstones in a cms_config doc (key 'events.suppressedUids')
-- and the sync route honors BOTH stores. Step 2 below folds any
-- fallback tombstones accumulated that way into the real column.
--
-- Apply (either):
--   • Supabase dashboard → SQL editor → paste this file → Run
--   • node scripts/apply-sql.mjs supabase/events-suppression.sql
--     (needs SUPABASE_PAT + SUPABASE_REF env vars)
-- ============================================================

-- 1) The tombstone column (jsonb array of feed UID strings).
alter table public.calendar_sync_configs
  add column if not exists suppressed_uids jsonb not null default '[]'::jsonb;

-- 2) Fold in any fallback tombstones the client wrote to cms_config while
--    the column was missing. Union per config id, duplicates removed.
--    No-op when cms_config (or the fallback doc) doesn't exist.
do $$
declare fallback jsonb;
begin
  if to_regclass('public.cms_config') is null then
    return;
  end if;
  select value into fallback
    from public.cms_config
   where key = 'events.suppressedUids';
  if fallback is null or jsonb_typeof(fallback) <> 'object' then
    return;
  end if;
  update public.calendar_sync_configs c
     set suppressed_uids = coalesce(
       (
         select jsonb_agg(distinct u)
         from (
           select jsonb_array_elements_text(
             case when jsonb_typeof(c.suppressed_uids) = 'array'
                  then c.suppressed_uids else '[]'::jsonb end
           ) as u
           union
           select jsonb_array_elements_text(
             case when jsonb_typeof(fallback -> c.id) = 'array'
                  then fallback -> c.id else '[]'::jsonb end
           )
         ) s(u)
       ),
       '[]'::jsonb)
   where fallback ? c.id;
end $$;
