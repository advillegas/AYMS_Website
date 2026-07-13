# Amigas Y Más Social (AYMS)

The website + community platform for **Amigas Y Más Social** — a Latina travel
community offering curated group trips, local events, Amigas Summer Camp, and a
members-only community portal.

- **Marketing site:** home, `/trips`, `/camp`, `/events`, `/gallery`, `/faq`,
  `/links`, `/concierge`, `/privacy`, `/terms` — all content is editable from
  the built-in admin.
- **Community portal:** `/community` — chat channels, DMs, meetups, member
  directory, profiles, voice/video rooms.
- **Admin:** `/admin` (site editor: page builder, content panels, trips,
  events, SEO, settings) and `/community/admin` (CRM: leads, agreements,
  members, moderation, analytics, calendar). The two are cross-linked.
- **AI assistant:** floating chatbot grounded in live trips/events plus
  owner-authored notes (Admin → Content → Chatbot).

## Stack

- **Next.js 16 / React 19 / TypeScript / Tailwind CSS v4**, deployed on Vercel.
- **Backends (dual):** Firebase (Firestore/Auth/Storage) is the **active**
  community backend; a Supabase mirror sits behind the
  `NEXT_PUBLIC_USE_SUPABASE` flag for an atomic cutover.
  **CMS content** (`cms_pages`, `cms_config`, versions, media uploads) lives in
  **Supabase regardless of the flag.**
- **AI:** Anthropic Claude via the AI SDK (`/api/chat`), rate-limited.
- **State:** zustand stores in `src/lib/*-store.ts` (optimistic writes with
  rollback + realtime subscriptions).

## Getting started

```bash
npm install
npm run dev          # http://localhost:5005
```

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_FIREBASE_*` — live community backend.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — CMS storage
  (and standby community backend).
- `NEXT_PUBLIC_USE_SUPABASE` — `false` in production today.
- `ANTHROPIC_API_KEY` — enables the chatbot.

Useful scripts: `npm run lint`, `npx tsc --noEmit`. SQL for the Supabase side
lives in `supabase/*.sql` (apply via `node scripts/apply-sql.mjs <file>`).

## Content editing model (3 layers)

1. **Section builder** (`cms_pages`) — drag-and-drop page composition with
   draft/live publish (double-click the status badge), templates, and 10-deep
   version history with one-click revert.
2. **Structured content panels** (`cms_config` via `src/lib/use-site-content.ts`)
   — typed domains (home, gallery, FAQ, destinations, links page, footer,
   camp facts/CTAs/sponsors, chatbot notes…) edited in Admin → Content.
3. **Inline click-to-edit** (`cms_config.overrides`) — every wrapped text/image
   on the marketing pages is editable in place, with a rich-text toolbar
   (bold/italic/underline, sizes, brand fonts, Spanish accents palette) and a
   smart image cropper.

Coded defaults always render until an admin saves an override, so the site
works with an empty database.

## Operational notes

- `STATE.md`, `LOOP.md`, `loop-run-log.md` — the ongoing improvement-loop
  state, cadence, and history (see `docs/safety.md` for agent guardrails).
- `firestore.rules` must match the admin email used by the app — **review and
  deploy rules after changes** (`firebase deploy --only firestore:rules`).
- Supabase RLS for community tables is permissive and the `media` bucket is
  open — **harden before opening registration** (see `supabase/cms-hardening.sql`
  for the pattern already applied to CMS tables).
- macOS AppleDouble shadows (`._*`) are ignored via `.gitignore`; don't re-add
  them (the repo previously tracked 221 of them from an ExFAT drive).
