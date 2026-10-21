-- ============================================================
-- Remove the admin@ayms.com privilege shortcut.
--
-- Until now is_app_admin() (and the users_role_guard trigger) treated ANY
-- JWT whose email is admin@ayms.com as a full admin. That address was the
-- Firebase-era admin identity; the Supabase admin is
-- admin@amigasymassocial.com and the DB no longer needs an email shortcut
-- at all because the 'admin' users row carries role = 'admin' and is
-- linked to the admin's auth uid (verified live: users.id='admin',
-- auth_id set; the owner's Google row also has role='admin').
--
-- Why it matters: ayms.com is NOT owned by Amigas Y Más Social — it has
-- live MX records at a third party. With self-signup enabled, whoever
-- controls that mailbox could register admin@ayms.com, confirm the email,
-- and pass every RLS policy as admin (read all DMs, edit any profile,
-- grant roles). Nothing in the app depends on the shortcut.
--
-- Apply in the Supabase SQL editor (or: node scripts/apply-sql.mjs
-- supabase/admin-email-hardening.sql). Idempotent.
--
-- Verify afterwards (both must NOT mention ayms.com):
--   select pg_get_functiondef('public.is_app_admin'::regproc);
--   select pg_get_functiondef('public.guard_user_role'::regproc);
-- Then sign in as the admin and confirm the admin panel still loads
-- (is_app_admin() → true via the role clause).
-- ============================================================

create or replace function public.is_app_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users
                  where id = public.current_app_user_id() and role = 'admin')
$$;

create or replace function public.guard_user_role()
returns trigger language plpgsql set search_path = public as $$
begin
  -- API roles are the only untrusted callers; the dashboard / migrations
  -- run as postgres (same exemption guard_user_auth_id already makes).
  if public.is_service_role()
     or current_user not in ('anon', 'authenticated')
     or public.is_app_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'users.role changes require an admin or the service role';
  end if;
  if tg_op = 'INSERT' and coalesce(new.role, '') = 'admin' then
    raise exception 'admin role grants require an admin or the service role';
  end if;
  return new;
end $$;

-- Belt and braces: if anyone has already registered that address, strip
-- any privilege it may have picked up. (No-op when no such row exists.)
update public.users
   set role = 'amiga'
 where lower(email) = 'admin@ayms.com'
   and id <> 'admin'
   and role = 'admin';
