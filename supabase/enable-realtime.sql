-- Enable Postgres logical replication (Supabase Realtime) on every
-- table the app subscribes to, and set REPLICA IDENTITY FULL so UPDATE
-- and DELETE change events carry the complete old/new row (needed for
-- client-side cache reconciliation).

do $$
declare t text;
begin
  foreach t in array array[
    'users','messages','conversations','conversation_messages','friendships',
    'roles','user_roles','channels','trips','events','event_comments','calendar_sync_configs'
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
