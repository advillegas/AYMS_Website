# Firebase → Supabase cutover runbook

The app dual-runs both backends: every hook, the auth layer, and the storage
layer dispatch on `NEXT_PUBLIC_USE_SUPABASE` (`src/lib/supabase.ts`). Firebase
stays fully functional until the flag is flipped, and flipping it back is the
rollback. Follow the steps in order.

## Prerequisites

App env vars (`.env.local` locally, Project Settings → Environment Variables on
Vercel — see `.env.example` for descriptions):

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon/publishable key |
| `NEXT_PUBLIC_USE_SUPABASE` | yes | `false` until step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only; admin provisioning, calendar sync, newsletter, Stream tokens |
| `ADMIN_PASSWORD` | yes | also becomes the Supabase password of `admin@ayms.com` (step 5) |
| `CRON_SECRET` | yes (prod) | guards `/api/calendar/sync`; route answers 503 without it |
| `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_STREAM_API_KEY`, `STREAM_API_SECRET`, `NEXT_PUBLIC_GIPHY_API_KEY` | unchanged | backend-agnostic |
| `NEXT_PUBLIC_FIREBASE_*` | keep set | required for dual-run and for the migration source |

Script-only env vars (shell session, not the app):

- `SUPABASE_PAT` — personal access token (https://supabase.com/dashboard/account/tokens), for `scripts/apply-sql.mjs`
- `SUPABASE_REF` — project ref, for `apply-sql.mjs` + `migrate-firestore-to-supabase.mjs`
- `SUPABASE_KEY` / `SB_SERVICE` — service_role key, for the two migration scripts
- `SB_URL` — `https://<ref>.supabase.co`, for `migrate-storage.mjs`
- `FIREBASE_SA` — path to a Firebase service-account JSON (Project Settings → Service accounts → Generate new private key)

Optional tooling: `.mcp.json` configures the official Supabase MCP server for
Claude Code; it reads `SUPABASE_ACCESS_TOKEN` (same value as `SUPABASE_PAT`)
from the environment.

## 1. Apply SQL (order matters)

```powershell
$env:SUPABASE_PAT = "<pat>"; $env:SUPABASE_REF = "<ref>"
node scripts/apply-sql.mjs supabase/schema.sql
node scripts/apply-sql.mjs supabase/policies.sql
node scripts/apply-sql.mjs supabase/enable-realtime.sql
node scripts/apply-sql.mjs supabase/storage-policies.sql
```

(POSIX shells: `SUPABASE_PAT=... SUPABASE_REF=... node scripts/apply-sql.mjs ...`.)

`schema.sql` creates tables and helper functions; `policies.sql` replaces the
permissive bootstrap RLS with the hardened per-table policies and must run
after it. `storage-policies.sql` provisions the `media` bucket (10 MB cap,
image MIME types) and its policies — it must run before step 3. All four
files are idempotent.

## 2. Migrate Firestore data

```powershell
$env:FIREBASE_SA = "C:\path\to\service-account.json"
$env:SUPABASE_REF = "<ref>"; $env:SUPABASE_KEY = "<service_role key>"
node scripts/migrate-firestore-to-supabase.mjs
```

Reads every live collection with admin credentials and upserts into Postgres:
users, messages, conversations(+messages), friendships, events(+comments,
+rsvps), trips, agreements, meetups(+rsvps), tripReservations, reports,
modActions, testimonials, newsletterSignups, calendarSyncConfigs,
config/{roles,channels,userRoles,moderation}, and the per-user subcollections
notifications/{uid}/items, users/{uid}/badges, users/{uid}/passport.

Idempotent (merge on primary key) — safe to re-run; run it again right before
the flag flip to pick up writes that happened since the first pass.
`users.auth_id` is never written: it is linked at each member's first Supabase
login.

## 3. Migrate storage objects

```powershell
$env:SB_URL = "https://<ref>.supabase.co"; $env:SB_SERVICE = "<service_role key>"
node scripts/migrate-storage.mjs
```

Copies every `firebasestorage` URL referenced by migrated rows into the
`media` bucket (`migrated/` prefix) and rewrites the rows: users
(avatar/cover/gallery), messages (attachments/post media/avatars), DMs,
conversations' last-message preview, event + trip images, comment/RSVP/
reservation/meetup/notification avatars. Idempotent; re-run after step 2
re-runs.

## 4. Flip the flag

1. Set `NEXT_PUBLIC_USE_SUPABASE=true` in Vercel env (all environments you are
   cutting over) and in `.env.local`.
2. Redeploy. `NEXT_PUBLIC_*` vars are inlined at build time — the flag change
   takes effect only with a fresh build, and rollback likewise requires a
   redeploy.

## 5. Admin first login (provisioning)

Log in at `/admin` with `ADMIN_PASSWORD` once after the flip. The login route
then provisions the Supabase auth user `admin@ayms.com` with that password and
seeds the `users` row `{id: 'admin', role: 'admin'}` (idempotent; requires
`SUPABASE_SERVICE_ROLE_KEY` on the server). The client then opens a real
Supabase session for the admin, which RLS admin checks and the "Sync now"
button depend on. If the service key is missing, login still succeeds but
reports `adminBridge: 'unavailable'` and admin features that need RLS
privileges will not work.

## 6. Seeding note (fresh projects only)

On a brand-new project with no migrated data, the client-side seeds for trips
and testimonials only pass hardened RLS under an admin session — sign in as
admin once and visit the trips/testimonials pages to populate them. Migrated
projects skip this (the data arrives in step 2).

## 7. Verification checklist

- **Auth:** new-member sign-up; migrated member resets password ("forgot
  password") and signs in; profile resolves to the original member id (posts,
  friends, badges intact).
- **Profiles/storage:** avatar, cover, gallery, post-image uploads land in
  `media` and render; migrated avatars render (no `firebasestorage` URLs in
  the UI).
- **Chat:** channel list, realtime messages, reactions, threads, polls,
  attachments; geo/local channel visibility.
- **DMs/friends:** conversation list + realtime DMs; friend request → accept;
  non-participants cannot read DMs.
- **Events:** calendar lists migrated + new events; comments; RSVPs (going/
  interested toggle); ICS feed (`/api/calendar/feed`) serves Supabase events.
- **Meetups:** create (geocoded), list sorted by distance, RSVP, host edit/
  delete.
- **Trips/reservations:** trips page, reserve + waitlist math, admin roster.
- **Agreements:** admin creates/sends; prospect signs (`sent →
  prospect_signed` only); completed agreements immutable.
- **Notifications:** bell shows migrated history; friend-request and RSVP
  actions push new ones; mark-read sticks.
- **Badges/passport:** earned badges + passport stamps visible; adding a stamp
  persists.
- **Moderation:** report a message; admin queue shows it; ban/mute/resolve
  write `moderation_config`/`mod_actions`.
- **Newsletter:** footer signup persists to `newsletter_signups` (duplicate
  email reports already-subscribed); admin Leads page lists rows.
- **Calendar sync:** admin adds an iCal feed; "Sync now" works (Supabase
  session token); Vercel cron run updates `last_sync_at`.
- **Video:** join a voice/video channel; `/api/stream/token` mints a token for
  the canonical member id.
- **Admin:** members panel (role promote/demote), metrics, leads, calendar,
  agreements all load under the admin session.

## 8. Rollback

Set `NEXT_PUBLIC_USE_SUPABASE=false` and redeploy. Firebase was never touched,
so the site resumes exactly where it left off. Caveat: anything written to
Supabase while the flag was on (messages, signups, RSVPs) is **not** synced
back to Firebase — keep the verification window short, and re-run step 2/3
before flipping forward again.

## Known limitations

- **Passwords are not portable.** Firebase password hashes are not migrated;
  every existing member must use "Forgot password" once on the Supabase login
  to set a password (their email keys the account link — `users.auth_id` is
  backfilled on that first login).
- Meetups (and their RSVPs) are included in schema, policies, realtime, and
  migration — previously a parity gap; verify them explicitly in step 7.
- `users.raw` keeps the original Firestore document, including stale
  `firebasestorage` URLs. Harmless (nothing reads URLs from it), but don't
  treat it as a source of truth.
- Storage caps collapse from Firebase's per-path limits (5/8/10 MB) to a
  single 10 MB bucket-level cap with image-only MIME types.
- Firestore/Firebase Storage stay live (read-only in practice) until you
  decommission them; do that only after the rollback window has closed.
