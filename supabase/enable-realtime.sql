-- Enable Postgres logical replication (Supabase Realtime) on every
-- table the app subscribes to, and set REPLICA IDENTITY FULL so UPDATE
-- and DELETE change events carry the complete old/new row (needed for
-- client-side cache reconciliation).
--
-- Apply order: schema.sql → policies.sql → enable-realtime.sql →
--              storage-policies.sql
--
-- Note: postgres_changes events are filtered per subscriber by the RLS
-- select policies in policies.sql — anonymous subscriptions to
-- auth-gated tables go silent by design.

do $$
declare t text;
begin
  foreach t in array array[
    'users','messages','conversations','conversation_messages','friendships',
    'roles','user_roles','channels','trips','events','event_comments','calendar_sync_configs',
    'agreements','meetups','rsvps','trip_reservations','notifications','reports',
    'mod_actions','testimonials','newsletter_signups','moderation_config',
    'user_badges','passport_stamps'
  ]
  loop
    execute format('alter table public.%I replica identity full;', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then
      -- already in the publication; ignore
      null;
    end;
  end loop;
end $$;
