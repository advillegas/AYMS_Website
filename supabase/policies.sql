-- ============================================================
-- AYMS — hardened Row Level Security policies (Firestore-rules parity).
--
-- Apply order: schema.sql → policies.sql → enable-realtime.sql →
--              storage-policies.sql
--
-- Identity model: rows store the CANONICAL app user id (users.id — the
-- original Firebase UID for migrated members, the Supabase auth uid for
-- new ones), so policies never compare auth.uid() to user_id columns
-- directly. public.current_app_user_id() (schema.sql) does the mapping
-- (auth_id match with email fallback) and public.is_app_admin() mirrors
-- firestore.rules isAdmin()/isAdminEmail().
--
-- Both helpers are referenced as (select public.fn()) so Postgres
-- evaluates them once per statement (InitPlan), not per row.
--
-- service_role bypasses RLS entirely (server routes, migration scripts).
-- Tables with RLS enabled and no matching policy DENY — the Firestore
-- catch-all is implicit.
--
-- Idempotent: every policy is dropped before being (re)created.
-- ============================================================

-- ---------- drop the legacy permissive policies on every table ----------
do $$
declare t text;
begin
  foreach t in array array[
    'users','messages','conversations','conversation_messages','friendships',
    'roles','user_roles','channels','events','event_comments','calendar_sync_configs',
    'trips','agreements','meetups','rsvps','trip_reservations','notifications',
    'reports','mod_actions','testimonials','newsletter_signups','moderation_config',
    'user_badges','passport_stamps'
  ]
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_all_read', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_write', t);
  end loop;
end $$;

-- ============================================================
-- users — public directory (landing page reads while signed out).
-- Self-create as 'amiga' only (no self-escalation; the admin-email
-- bootstrap and role changes are arbitrated by the users_role_guard /
-- users_auth_id_guard triggers in schema.sql). Own-row or admin updates.
-- ============================================================
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to anon, authenticated using (true);

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert to authenticated with check (
    (id = (select auth.uid()::text)
      and lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
      and role = 'amiga')
    or (select public.is_app_admin())
  );

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (id = (select public.current_app_user_id()) or (select public.is_app_admin()))
  with check (id = (select public.current_app_user_id()) or (select public.is_app_admin()));

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
  for delete to authenticated using ((select public.is_app_admin()));

-- ============================================================
-- messages — channel chat. Signed-in read; create only as yourself;
-- updates open to members (reactions / poll votes / thread counts) with
-- authorship immutability enforced by column-level grants below; delete
-- is author-or-admin (moderation).
-- ============================================================
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (true);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated with check (user_id = (select public.current_app_user_id()));

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated using (true) with check (true);

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated using (
    user_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

-- Authorship immutability (firestore.rules: update may not reassign
-- userId): RLS is row-level, so pin the identity columns with
-- column-level grants — authenticated may UPDATE only the listed columns.
revoke update on public.messages from authenticated;
grant update (user_name, user_avatar, content, attachments, reactions, poll,
              thread_parent_id, thread_count, is_post, post_title, post_body,
              post_media, msg_lat, msg_lng, author_local_visibility, edited_at)
  on public.messages to authenticated;

-- ============================================================
-- conversations — participant-gated DMs / group chats.
-- ============================================================
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids));

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check ((select public.current_app_user_id()) = any(participant_ids));

-- Update gates membership on the OLD row only (USING). The explicit
-- `with check (true)` is load-bearing: leaving a group chat removes
-- yourself from participant_ids, so the NEW row no longer contains you —
-- checking membership there (or omitting the clause, which defaults
-- WITH CHECK to the USING expression) would deny every group leave.
-- Matches firestore.rules, which checked resource.data.participantIds.
drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations
  for update to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids))
  with check (true);

drop policy if exists conversations_delete on public.conversations;
create policy conversations_delete on public.conversations
  for delete to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids));

-- ============================================================
-- conversation_messages — access inherited from the parent conversation.
-- ============================================================
drop policy if exists conversation_messages_select on public.conversation_messages;
create policy conversation_messages_select on public.conversation_messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
             where c.id = conversation_id
               and (select public.current_app_user_id()) = any(c.participant_ids))
  );

drop policy if exists conversation_messages_insert on public.conversation_messages;
create policy conversation_messages_insert on public.conversation_messages
  for insert to authenticated with check (
    user_id = (select public.current_app_user_id())
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id
                   and (select public.current_app_user_id()) = any(c.participant_ids))
  );

drop policy if exists conversation_messages_update on public.conversation_messages;
create policy conversation_messages_update on public.conversation_messages
  for update to authenticated
  using (
    exists (select 1 from public.conversations c
             where c.id = conversation_id
               and (select public.current_app_user_id()) = any(c.participant_ids))
  )
  with check (
    exists (select 1 from public.conversations c
             where c.id = conversation_id
               and (select public.current_app_user_id()) = any(c.participant_ids))
  );

drop policy if exists conversation_messages_delete on public.conversation_messages;
create policy conversation_messages_delete on public.conversation_messages
  for delete to authenticated using (
    user_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

-- Authorship immutability via column-level grants (see messages above).
revoke update on public.conversation_messages from authenticated;
grant update (user_name, user_avatar, content, attachments, reactions,
              thread_parent_id, thread_count, edited_at)
  on public.conversation_messages to authenticated;

-- ============================================================
-- friendships — either participant reads/updates/deletes; only the
-- requester creates, and only with themselves in the participant set.
-- ============================================================
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids));

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated with check (
    requester_id = (select public.current_app_user_id())
    and (select public.current_app_user_id()) = any(participant_ids)
  );

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids))
  with check ((select public.current_app_user_id()) = any(participant_ids));

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete to authenticated
  using ((select public.current_app_user_id()) = any(participant_ids));

-- ============================================================
-- roles / user_roles / channels / moderation_config — was Firestore
-- config/*: any member reads, only an admin writes.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['roles','user_roles','channels','moderation_config']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_app_admin()));',
      t || '_insert', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));',
      t || '_update', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_app_admin()));',
      t || '_delete', t);
  end loop;
end $$;

-- ============================================================
-- events / trips / testimonials — public marketing reads (drafts stay
-- world-readable by design, parity with firestore.rules); admin writes.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['events','trips','testimonials']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_app_admin()));',
      t || '_insert', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));',
      t || '_update', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_app_admin()));',
      t || '_delete', t);
  end loop;
end $$;

-- ============================================================
-- event_comments — signed-in read; create as yourself; authorship
-- immutable via column grants; delete author-or-admin.
-- ============================================================
drop policy if exists event_comments_select on public.event_comments;
create policy event_comments_select on public.event_comments
  for select to authenticated using (true);

drop policy if exists event_comments_insert on public.event_comments;
create policy event_comments_insert on public.event_comments
  for insert to authenticated with check (user_id = (select public.current_app_user_id()));

drop policy if exists event_comments_update on public.event_comments;
create policy event_comments_update on public.event_comments
  for update to authenticated using (true) with check (true);

drop policy if exists event_comments_delete on public.event_comments;
create policy event_comments_delete on public.event_comments
  for delete to authenticated using (
    user_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

revoke update on public.event_comments from authenticated;
grant update (user_name, user_avatar, content)
  on public.event_comments to authenticated;

-- ============================================================
-- rsvps (events + meetups) — signed-in read; owner-only writes (the
-- Firestore doc id WAS the member uid; the (target_type, target_id,
-- user_id) PK preserves one-RSVP-per-member).
-- ============================================================
drop policy if exists rsvps_select on public.rsvps;
create policy rsvps_select on public.rsvps
  for select to authenticated using (true);

drop policy if exists rsvps_insert on public.rsvps;
create policy rsvps_insert on public.rsvps
  for insert to authenticated with check (user_id = (select public.current_app_user_id()));

drop policy if exists rsvps_update on public.rsvps;
create policy rsvps_update on public.rsvps
  for update to authenticated
  using (user_id = (select public.current_app_user_id()))
  with check (user_id = (select public.current_app_user_id()));

drop policy if exists rsvps_delete on public.rsvps;
create policy rsvps_delete on public.rsvps
  for delete to authenticated using (user_id = (select public.current_app_user_id()));

-- ============================================================
-- meetups — member-organized. Signed-in read; host creates as
-- themselves; host-or-admin edits/deletes.
-- ============================================================
drop policy if exists meetups_select on public.meetups;
create policy meetups_select on public.meetups
  for select to authenticated using (true);

drop policy if exists meetups_insert on public.meetups;
create policy meetups_insert on public.meetups
  for insert to authenticated with check (host_id = (select public.current_app_user_id()));

drop policy if exists meetups_update on public.meetups;
create policy meetups_update on public.meetups
  for update to authenticated
  using (host_id = (select public.current_app_user_id()) or (select public.is_app_admin()))
  with check (host_id = (select public.current_app_user_id()) or (select public.is_app_admin()));

drop policy if exists meetups_delete on public.meetups;
create policy meetups_delete on public.meetups
  for delete to authenticated using (
    host_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

-- ============================================================
-- trip_reservations — signed-in read (capacity counts); members manage
-- their own reservation; admins moderate.
-- ============================================================
drop policy if exists trip_reservations_select on public.trip_reservations;
create policy trip_reservations_select on public.trip_reservations
  for select to authenticated using (true);

drop policy if exists trip_reservations_insert on public.trip_reservations;
create policy trip_reservations_insert on public.trip_reservations
  for insert to authenticated with check (user_id = (select public.current_app_user_id()));

drop policy if exists trip_reservations_update on public.trip_reservations;
create policy trip_reservations_update on public.trip_reservations
  for update to authenticated
  using (user_id = (select public.current_app_user_id()) or (select public.is_app_admin()))
  with check (user_id = (select public.current_app_user_id()) or (select public.is_app_admin()));

drop policy if exists trip_reservations_delete on public.trip_reservations;
create policy trip_reservations_delete on public.trip_reservations
  for delete to authenticated using (
    user_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

-- ============================================================
-- notifications — recipient-or-admin reads; any signed-in member may
-- create one FOR another member ("said hi"); only the recipient mutates
-- read-state / deletes.
-- ============================================================
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (
    recipient_id = (select public.current_app_user_id()) or (select public.is_app_admin())
  );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (true);

-- NOTE: the update/delete policies mirror the SELECT policy's is_app_admin()
-- fallback. Without it the password-admin (whose canonical id is 'admin' and
-- whose session resolves via is_app_admin(), not always via
-- current_app_user_id()) could READ notifications but silently fail to mark
-- them read/delete — the UPDATE matched zero rows under RLS, so the badge
-- "cleared" optimistically then revived on reload.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = (select public.current_app_user_id()) or (select public.is_app_admin()))
  with check (recipient_id = (select public.current_app_user_id()) or (select public.is_app_admin()));

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (recipient_id = (select public.current_app_user_id()) or (select public.is_app_admin()));

-- ============================================================
-- reports — members file as themselves; only admins read/triage.
-- ============================================================
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated using ((select public.is_app_admin()));

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter_id = (select public.current_app_user_id()));

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
  for update to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports
  for delete to authenticated using ((select public.is_app_admin()));

-- ============================================================
-- mod_actions — append-only audit log: signed-in read (moderation
-- transparency), admin insert, NO update/delete policies (the client
-- never mutates entries; service_role bypasses if cleanup is ever needed).
-- ============================================================
drop policy if exists mod_actions_select on public.mod_actions;
create policy mod_actions_select on public.mod_actions
  for select to authenticated using (true);

drop policy if exists mod_actions_insert on public.mod_actions;
create policy mod_actions_insert on public.mod_actions
  for insert to authenticated with check ((select public.is_app_admin()));

drop policy if exists mod_actions_update on public.mod_actions;
drop policy if exists mod_actions_delete on public.mod_actions;

-- ============================================================
-- calendar_sync_configs — admin-only end to end (the sync cron runs with
-- the service role, which bypasses RLS — closes the gap noted in
-- firestore.rules).
-- ============================================================
drop policy if exists calendar_sync_configs_select on public.calendar_sync_configs;
create policy calendar_sync_configs_select on public.calendar_sync_configs
  for select to authenticated using ((select public.is_app_admin()));

drop policy if exists calendar_sync_configs_insert on public.calendar_sync_configs;
create policy calendar_sync_configs_insert on public.calendar_sync_configs
  for insert to authenticated with check ((select public.is_app_admin()));

drop policy if exists calendar_sync_configs_update on public.calendar_sync_configs;
create policy calendar_sync_configs_update on public.calendar_sync_configs
  for update to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

drop policy if exists calendar_sync_configs_delete on public.calendar_sync_configs;
create policy calendar_sync_configs_delete on public.calendar_sync_configs
  for delete to authenticated using ((select public.is_app_admin()));

-- ============================================================
-- newsletter_signups — public subscribe form (validated), private list.
-- ============================================================
drop policy if exists newsletter_signups_select on public.newsletter_signups;
create policy newsletter_signups_select on public.newsletter_signups
  for select to authenticated using ((select public.is_app_admin()));

drop policy if exists newsletter_signups_insert on public.newsletter_signups;
create policy newsletter_signups_insert on public.newsletter_signups
  for insert to anon, authenticated with check (
    char_length(email) > 3 and char_length(email) < 320 and position('@' in email) > 1
  );

drop policy if exists newsletter_signups_update on public.newsletter_signups;
create policy newsletter_signups_update on public.newsletter_signups
  for update to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

drop policy if exists newsletter_signups_delete on public.newsletter_signups;
create policy newsletter_signups_delete on public.newsletter_signups
  for delete to authenticated using ((select public.is_app_admin()));

-- ============================================================
-- agreements — admin authors/sends/counter-signs; the prospect may read
-- and update their OWN agreement. The agreements_guard trigger
-- (schema.sql) additionally restricts the prospect update to the signing
-- columns and the exact sent→prospect_signed transition.
-- ============================================================
drop policy if exists agreements_select on public.agreements;
create policy agreements_select on public.agreements
  for select to authenticated using (
    (select public.is_app_admin()) or prospect_id = (select public.current_app_user_id())
  );

drop policy if exists agreements_insert on public.agreements;
create policy agreements_insert on public.agreements
  for insert to authenticated with check ((select public.is_app_admin()));

drop policy if exists agreements_update on public.agreements;
create policy agreements_update on public.agreements
  for update to authenticated
  using ((select public.is_app_admin()) or prospect_id = (select public.current_app_user_id()))
  with check ((select public.is_app_admin()) or prospect_id = (select public.current_app_user_id()));

drop policy if exists agreements_delete on public.agreements;
create policy agreements_delete on public.agreements
  for delete to authenticated using ((select public.is_app_admin()));

-- ============================================================
-- user_badges / passport_stamps — mirror users/{uid} subcollections:
-- signed-in read (profiles show other members' badges/stamps),
-- owner-only writes.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['user_badges','passport_stamps']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select public.current_app_user_id()));',
      t || '_insert', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select public.current_app_user_id())) with check (user_id = (select public.current_app_user_id()));',
      t || '_update', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select public.current_app_user_id()));',
      t || '_delete', t);
  end loop;
end $$;
