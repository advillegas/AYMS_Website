# AYMS_Website — Project Map

> Comprehensive map of the codebase, content, data model, and full git timeline.
> Generated 2026-06-09 from HEAD `a1b9924` via multi-agent analysis (5 mappers + completeness audit, verified against the repo).

**Amigas Y Más Social (AYMS)** — `amigasymassocial.com` — a Latina travel community: public marketing site (trips, events, gallery, FAQ, link-in-bio) + members-only community portal (Discord-style chat, DMs, meetups, profiles, badges) + admin CRM (trips/events publishing, leads, in-house e-signature agreements, moderation, analytics). Mid-migration from **Firebase → Supabase** behind a runtime flag.

---

## 1. Snapshot facts

| Fact | Value |
|---|---|
| Remote | https://github.com/advillegas/AYMS_Website (single branch `main`, linear history, no tags, no CI) |
| Commits | 27, spanning 2026-05-29 → 2026-06-09 (~11 days, only 5 active days; 85% of commits in the final 44 hours) |
| Authors | Justin <justin@teamnero.com> (16 — features/architecture/security), Aaron <aaron.d.villegas@gmail.com> (10 — branding/copy/Supabase port, mostly Cursor co-authored), "AYMS Baseline" (1 — the import) |
| Tracked files | 496 = 275 real + **221 committed macOS AppleDouble `._*` junk files** (now gitignored but still tracked — cleanup overdue) |
| Stack | Next.js **16.2.4** (exact-pinned, App Router, Turbopack) · React **19.2.4** · TypeScript 5.9 strict · Tailwind **v4** (CSS-first, no tailwind.config) · shadcn/ui ("base-nova" on Base UI, not Radix) |
| Backends | Firebase (live: Firestore/Auth/Storage, project `amigas-y-mas-social`) + Supabase mirror (project ref `erklhkrpdqyshwrkuxmf`) behind `NEXT_PUBLIC_USE_SUPABASE` |
| Hosting | Vercel (`vercel.json` cron: `/api/calendar/sync` every 15 min). Firebase deploys rules only — no hosting/functions |
| Dev server | `npm run dev` → port **5005** (`.claude/launch.json` matches). `.npmrc` has `legacy-peer-deps=true` (emoji-mart peer-dep on React ≤18) |
| Tests / CI | **None.** No test script, no typecheck script, no `.github/` |
| Docs | README is stock create-next-app boilerplate (wrong port). `CLAUDE.md` → `@AGENTS.md`; `AGENTS.md` warns: Next 16 post-dates agent training — read `node_modules/next/dist/docs/` before writing code |
| `.env.local` | **Absent in this clone** — must be created from `.env.example` before the app can talk to Firebase |

---

## 2. Timeline

### Development eras

| Phase | When | Commits | What happened |
|---|---|---|---|
| 1. Baseline import | May 29 | `51e7250` | Pre-existing site imported wholesale: 431 files, +49,210 lines |
| 2. "Bold 2026" redesign | Jun 2 | `c910ce3` | New design system, WCAG 2.2 pass, server-validated admin login, tightened rules. Then a 5-day gap |
| 3. Council audits + community build-out | Jun 7–8 (night) | `32a6643`, `78b5ead`, `36e21df` | Two "council" review sweeps around the biggest feature commit (+12.6k lines: meetups, badges, passport/wrapped, moderation, RSVPs, onboarding, notifications) |
| 4. Editorial-luxe rebrand + CMS arc | Jun 8, 18:13–23:52 | 11 commits | Cream/Fraunces marketing rebrand; admin Firebase-auth bridge fix; CMS migrated to Firestore at 20:48 then **deleted entirely at 23:43** (−4,999 lines, "ahead of a ground-up rebuild"); Aaron's rapid-fire branding (4 wordmark revisions in 82 min) and copy commits |
| 5. Supabase dual-backend port | Jun 9, 00:06 | `deb1043`, `e1bada8` | Full parallel Supabase data/auth/storage layer behind the flag (+3,716 lines), immediate Vercel build hotfix |
| 6. CRM & e-signature sprint | Jun 9, 00:11–01:34 | 4 commits | Meetups map fix, live admin-published trips/events + leads pipeline, PandaDoc-style dual-signature agreements, `/links` page; `/play` quiz removed |
| 7. Copy + security finale | Jun 9, 09:41–16:36 | 3 commits | Two hero-copy tweaks; closing security council pass ("33 confirmed of 48 findings"): e-sign rules lockdown, Supabase trigger guards, SSRF/CSP/API hardening |

### Full commit log (oldest first)

| # | Hash | Date | Author | Summary |
|---|---|---|---|---|
| 1 | `51e7250` | 05-29 18:10 | Baseline | Import: 431 files, +49,210 lines |
| 2 | `c910ce3` | 06-02 16:47 | Justin | "Bold 2026" restyle, WCAG pass, admin login route, rules tightening (41 files) |
| 3 | `32a6643` | 06-07 20:58 | Justin | Council audit #1: hydration fix, ID-token verify, rate limiting, route boundaries (84 files) |
| 4 | `78b5ead` | 06-07 22:28 | Justin | **Community expansion** — feed, meetups, badges, passport, moderation, onboarding (+12,605) |
| 5 | `36e21df` | 06-08 00:43 | Justin | Council polish: perf memoization, a11y, JSON-LD, PWA manifest |
| 6 | `c7a5be0` | 06-08 18:13 | Justin | Admin auth bridge (fixed all admin writes) + editorial-luxe rebrand; removed fabricated press claims |
| 7 | `f6d5e7c` | 06-08 20:48 | Justin | CMS → shared Firestore (`cmsPages`/`cmsConfig`/`cmsTemplates`) |
| 8 | `a945215` | 06-08 22:03 | Aaron | Slogan → "The world is better with amigas" |
| 9 | `9032c18` | 06-08 22:18 | Justin | Trip cards: emoji → 8 real Wikimedia photos (`public/trips/`) |
| 10 | `0013c91` | 06-08 22:23 | Aaron | Wordmark: high-res transparent PNG |
| 11 | `41493fd` | 06-08 22:35 | Aaron | Auto-scrolling Bucket List + Testimonials marquees |
| 12 | `2472dcf` | 06-08 22:37 | Aaron | Wordmark: black keyline outline |
| 13 | `ea7e44a` | 06-08 22:45 | Justin | Rotating hero headline (12 variants); photos propagated to home/events |
| 14 | `336fca3` | 06-08 22:51 | Aaron | Wordmark: keyline thinned ~1/4 weight |
| 15 | `c1c8f6d` | 06-08 23:20 | Justin | Mobile 375px overflow fixes |
| 16 | `7d5e457` | 06-08 23:43 | Justin | **CMS removed entirely** (−4,999 lines, incl. `/admin` and `/p/[slug]`) |
| 17 | `ec6d086` | 06-08 23:45 | Aaron | Wordmark: "finalized outlined logo" (4th revision that evening) |
| 18 | `fe6f9b6` | 06-08 23:52 | Justin | Trip-detail dialog spacing fix |
| 19 | `deb1043` | 06-09 00:06 | Aaron | **Supabase backend port** behind `NEXT_PUBLIC_USE_SUPABASE` (+3,716) |
| 20 | `e1bada8` | 06-09 00:09 | Aaron | Hotfix: missing `@supabase/supabase-js` dep broke Vercel build |
| 21 | `42e03c3` | 06-09 00:11 | Justin | Meetup permission fix (`getCurrentUid()`); Leaflet meetups map |
| 22 | `06d5a48` | 06-09 00:25 | Justin | Gallery photos; **`/play` quiz game removed** (`game-data.ts` kept, now orphaned) |
| 23 | `66a0250` | 06-09 01:07 | Justin | **CRM: live admin-published trips & events** + leads pipeline (+2,266) |
| 24 | `e1bdd32` | 06-09 01:34 | Justin | **In-house e-signatures** + `/links` Beacons-style page (+2,867) |
| 25 | `72cf459` | 06-09 09:41 | Aaron | Hero copy swap |
| 26 | `b4b5a9a` | 06-09 12:26 | Aaron | Hero copy: added "Chase the horizon with amigas" |
| 27 | `a1b9924` | 06-09 16:36 | Justin | **Security council full-pass**: e-sign rules lockdown, Supabase triggers, SSRF guard, CSP |

### Churn worth knowing about

- **CMS built then deleted the same evening** (`f6d5e7c` → `7d5e457`, "ahead of a ground-up rebuild" that hasn't happened). Firestore rules for `cmsPages`/`cmsConfig`/`cmsTemplates` still exist.
- **Wordmark redone 4× in ~82 minutes**; hero/slogan copy touched 4× across Jun 8–9.
- **Removed features**: `/play` quiz, `/admin` + `/p/[slug]` CMS routes, landing arrow buttons, fabricated press logos (Vogue/Condé Nast/Refinery29).
- **Recurring ExFAT (Samsung T7) fights**: AppleDouble commits, Turbopack FS-cache disabled, `next/image unoptimized` workarounds — these are environment-driven, not arbitrary.
- **Two permission-denied bugs** from the dual identity model (store id `"admin"` vs real Firebase uid) — patched via auth bridge (`c7a5be0`) and `getCurrentUid()` (`42e03c3`).

---

## 3. Repository layout

```
AYMS_Website/
├── .claude/launch.json        # dev launch config, port 5005
├── firestore.rules            # 15.8 KB, ~23 collection blocks, deny-by-default
├── firestore.indexes.json     # 2 composite indexes (messages, conversations)
├── storage.rules              # avatars (uid-pinned) / covers / gallery / posts
├── firebase.json, .firebaserc # rules deployment; project amigas-y-mas-social
├── vercel.json                # cron: /api/calendar/sync every 15 min
├── next.config.ts             # ExFAT workarounds, image remotePatterns, security headers/CSP
├── components.json            # shadcn "base-nova"
├── public/  (27 files, ~6.7 MB)   # logo SVG, wordmark PNG, og-default, trips/gallery/events/destinations JPGs
├── scripts/ (5 .mjs)          # Supabase migration + Firestore smoke-test tooling
├── supabase/ (3 .sql)         # schema.sql (13 tables + triggers), enable-realtime, storage-policies
└── src/
    ├── app/        (58 files) # App Router — see route table
    ├── components/ (97 files) # landing/ community/ (49) admin/ chatbot/ ui/ (18 shadcn) seo/ trips/
    └── lib/        (65 files) # ALL data hooks + dual Firebase/Supabase implementations
```

No separate `hooks/`/`contexts/` dirs — everything lives in `src/lib`. Ghost artifacts: `src/app/play/` contains only `._page.tsx`; AppleDouble shadows of the deleted CMS files (`._builder-store.ts`, `._cms-store.ts`, etc.) are the only trace of the page-builder.

---

## 4. Routes

### Public marketing (client components, Navbar/Footer wrapped)

| URL | Purpose |
|---|---|
| `/` | Landing: Hero → Marquee → About → WhyUs → Destinations → Camp → Trips → Experiences → Testimonials → CommunityPreview → Contact |
| `/trips` | Trip catalog w/ filters + detail dialog + ReserveButton (live `useTrips`) |
| `/events` | Public events list w/ inline RSVP |
| `/featured` | Dark "Featured Spotlight" — soonest published+featured trip; newsletter capture |
| `/gallery` | Past-trips gallery (hardcoded `PAST_TRIPS`, year filter) |
| `/faq` | Searchable accordion, 16 hardcoded Q&As in 4 categories |
| `/links` | Beacons-style link-in-bio (static; socials @amigasymassocial). **Not in sitemap.ts — known gap** |
| `/login`, `/register`, `/forgot-password` | Auth: admin (server-validated) → Firebase email/password → Google → legacy localStorage fallback |

### Community portal (`/community/*` — client-side auth gate, noindex)

`/community` (Discord-style chat: threads, reactions, polls, GIFs, voice/video via Stream) · `/community/home` (dashboard) · `/messages` (DMs) · `/calendar` · `/meetups` (list + Leaflet map, distance-sorted) · `/members` · `/my-events` · `/notifications` · `/profile` (+ `/profile/[userId]`) · `/agreements/[id]` (**e-signature signing surface**, print CSS).

### Admin CRM (`/community/admin/*` — client-side `viewAdminPanel` gate; rules are the real boundary)

Hub + `trips` (CRUD/publish/feature/reorder) · `leads` (reservations, waitlists, newsletter) · `agreements` (send/countersign) · `roles` (19 permission keys) · `channels` · `members` · `moderation` · `analytics` · `calendar` (event CRUD + iCal feed sync).

### API routes (8)

| Route | Purpose | Guard |
|---|---|---|
| `POST /api/auth/login` | Admin credential check vs `ADMIN_PASSWORD` (constant-time) | 8/5min per IP, fail-closed |
| `POST /api/chat` | Site chatbot — streams **Claude Haiku** (`@ai-sdk/anthropic`) | 20/min per IP, 64KB cap, 24-turn cap; public |
| `GET /api/calendar/feed` (+`.ics` rewrite) | Public ICS feed of events | none (by design), CORS * |
| `POST/GET /api/calendar/sync` | Cron: pull external iCal feeds → Firestore `events` | `CRON_SECRET` bearer, SSRF blocklist |
| `POST /api/calendar/sync-now` | Admin "Sync now" proxy, injects `CRON_SECRET` server-side | Firebase ID-token (any session — **not admin-checked**) |
| `POST /api/newsletter/subscribe` | Lead capture → `newsletterSignups` (zod). **Never sends email** | 5/min per IP |
| `GET /api/og` | OG scraper for chat link previews (edge) | SSRF blocklist, 5s/200KB caps |
| `POST /api/stream/token` | Mints 1h Stream Video JWTs | Firebase ID-token; 503 in prod without it |

Metadata routes: `robots.ts` (disallow `/community/`, `/admin/`, `/api/`), `sitemap.ts` (8 URLs), `manifest.ts` (PWA, theme `#B51760`), `favicon.ico`.

---

## 5. Data model & dual-backend architecture

### Identity / roles
- `users/{uid}.role` ∈ `amiga | leader | admin`. No custom claims, **no Firebase Admin SDK anywhere** — privileged writes run client-side under rules.
- **Admin bridge**: server validates `ADMIN_PASSWORD` → client signs into Firebase Auth as `admin@ayms.com` with the same password (auto-provisioned) → rules recognize `isAdminEmail()`. Rotating the password requires rotating the Firebase account too.
- Fine-grained permissions (`config/roles`, `config/userRoles`, `viewAdminPanel`) gate UI only.

### Firestore collections (rules: deny-by-default catch-all)

`users` (public read; role self-escalation blocked) · `config/*` · `messages` · `conversations` (+`messages` subcoll, participant-only) · `events` (+`comments`, `rsvps`) · `trips` (public read incl. drafts — draft-hiding is client-query) · `meetups` (+`rsvps`) · `tripReservations` · `notifications/{uid}/items` · `friendships` · `reports` · `modActions` · `calendarSyncConfigs` · `newsletterSignups` (public create) · `testimonials` · `cmsPages`/`cmsConfig`/`cmsTemplates` (legacy, feature removed) · `agreements` (prospect update locked to the exact signing keys + forced `sent → prospect_signed`).

Storage: `avatars/{uid}` owner-only <5MB; `covers/`/`gallery/`/`posts/` auth+image+size-cap but **not uid-namespaced** (acknowledged).

### Supabase mirror (`supabase/schema.sql` — 13 tables)

`users, messages, conversations, conversation_messages, friendships, roles, user_roles, channels, events, event_comments, calendar_sync_configs, trips, agreements` — TEXT ids preserved, JSONB for variable shapes, realtime publication on all tables. **RLS enabled but fully permissive** (mirrors Firestore test-mode); **Supabase Auth NOT wired** (`auth.uid()` always NULL — Firebase stays the identity provider). Auth-independent Postgres trigger guards: `users_role_guard` (role escalation requires service_role) and `agreements_guard` (e-sign state machine, write-once signatures, completed undeletable). `media` storage bucket policies are wide open — "HARDEN before launch" noted in-file.

**Parity gap: `meetups` has no Supabase table** — the feature silently doesn't persist on the Supabase backend.

### The switch
`src/lib/supabase.ts:31`: `useSupabaseBackend = isSupabaseConfigured && NEXT_PUBLIC_USE_SUPABASE === "true"`. Every data domain has hook pairs (`use-trips.ts` / `use-trips-supabase.ts`, etc. — 29 consumer files) dispatched on that module-level constant. Rollback = flip the env var. **Server API routes are Firestore-only** (not dual-run).

### Ops scripts (`scripts/`)
`apply-sql.mjs` (run SQL via Supabase Management API) · `migrate-firestore-to-supabase.mjs` (full data migration, service-account read → PostgREST upsert; predates trips/agreements) · `migrate-storage.mjs` (Firebase Storage → `media` bucket + URL rewrite) · `smoke-firestore.mjs` / `clean-smoke-docs.mjs`.

### E-signature agreements (in-house, PandaDoc-style)
Templates + merge fields in `src/lib/agreements-data.ts` (bodies marked PLACEHOLDER — not legal advice). State machine `draft → sent → prospect_signed → completed` (+`void`), enforced at three layers (hooks, Firestore rules key-whitelist, Postgres trigger). Typed-name signatures with ISO timestamps; no crypto signing, no PDF, no email — "send" flips status and the prospect finds it in-app.

---

## 6. Content & brand

- **Slogan**: "The world is better with amigas" · pillars Connect/Empower/Celebrate (bilingual EN/ES flip-cards throughout) · founder **Sally Vee** · contact `hello@amigasymassocial.com` · IG/TikTok `@amigasymassocial`.
- **Hero**: 13 rotating headlines (4.2s crossfade, reduced-motion safe). Stat chips: "2k+ amigas / 30+ trips / 12 countries". CTA "Become an Amiga ♡".
- **Seed trips** (8, auto-seeded into Firestore on first run from `trips-data.ts`): Cancún $1,850 · Napa $950 · NYC $1,100 · Colombia $2,400 · Bali $2,800 (sold out) · Morocco $2,600 (sold out) · Japan $3,200 (waitlist) · Kenya Safari $3,500 — all 2026. Seed events incl. Summer Camp 2026 (Jul 15–18, 50-amiga cap).
- **Testimonials**: 8 bilingual entries, seeded into Firestore with static fallback.
- **Hardcoded vs live**: hero/about/why-us/camp/FAQ/links/gallery copy is hardcoded in components; trips/events/testimonials/members/channels/agreements are live Firestore (or Supabase) with seed fallbacks.
- **Design system**: Montserrat (body) · Playfair Display (headings) · Fraunces (editorial display) · Cormorant Garamond (detail) · Geist Mono. Brand: Vivid Magenta `#FF0099` (CTA), Vivid Pink `#B51760`, Blush `#FACDE8`, app bg `#FFF7FB`, Deep Plum `#6A1B4D`. Marketing "editorial-luxe" cream tokens (`.canvas-editorial`), glassmorphism, grain, marquees, flip-cards. All in `src/app/globals.css` (Tailwind v4 `@theme`, no config file).

---

## 7. Environment variables

From `.env.example`: `ADMIN_PASSWORD` · `ANTHROPIC_API_KEY` · `NEXT_PUBLIC_FIREBASE_{API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID}` · `NEXT_PUBLIC_GIPHY_API_KEY` (optional) · `NEXT_PUBLIC_STREAM_API_KEY` + `STREAM_API_SECRET` · `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_USE_SUPABASE` (the migration kill-switch).

Used in code but **missing from `.env.example`**: `CRON_SECRET` (load-bearing for calendar sync). Script-only: `FIREBASE_SA`, `SUPABASE_KEY`, `SUPABASE_PAT`, `SUPABASE_REF`, `SB_URL`, `SB_SERVICE`.

---

## 8. Known issues / cleanup backlog

1. **221 tracked AppleDouble `._*` files** (~884 KB, incl. `._.env.local`, `._.git`) — gitignored now but never untracked. Fix: `git rm --cached` sweep.
2. **Supabase backend is launch-unsafe by its own admission**: permissive RLS, open `media` bucket writes, no Supabase Auth. Safe only while `NEXT_PUBLIC_USE_SUPABASE=false`.
3. **Calendar cron can't actually write**: `/api/calendar/sync` uses unauthenticated Firestore REST, which `firestore.rules` denies (documented in the rules file) — needs a service account / Admin SDK.
4. `/api/calendar/sync-now` accepts any signed-in member, not just admins (low impact, rate-limited).
5. Single shared admin identity (`ADMIN_PASSWORD` doubles as the `admin@ayms.com` Firebase password, bridged client-side).
6. Rate limiting is per-serverless-instance memory (file header suggests Upstash/Redis for prod).
7. Storage `covers/`/`gallery/`/`posts/` not uid-namespaced — members can overwrite each other's uploads.
8. `users` collection fully public-readable (incl. email); privacy flags are client-enforced only. Trip drafts world-readable by design.
9. **Meetups missing from Supabase schema** (feature breaks under the flag).
10. Many `<Image unoptimized>` (ExFAT dev workaround) ships ~6.7 MB of unoptimized JPEGs in prod; 14 images ≥250 KB; 222 KB wordmark PNG renders at ~48px.
11. 5 orphaned create-next-app SVGs in `public/`; `game-data.ts` (43 KB) orphaned since `/play` removal (still used by passport/badges per commit notes — verify before deleting).
12. `/links` missing from `sitemap.ts`; README is unmodified boilerplate; no tests, no CI, no typecheck script.
13. `CRON_SECRET` absent from `.env.example` despite being required.

---

## 9. Working on this repo — gotchas

- **Read `AGENTS.md` seriously**: Next 16 has breaking changes vs training data; bundled docs at `node_modules/next/dist/docs/`.
- Dev: `npm install` (needs the `.npmrc` legacy-peer-deps), create `.env.local` from `.env.example`, `npm run dev` → http://localhost:5005.
- The original dev environment was a **Samsung T7 ExFAT volume** — that's why Turbopack FS cache is off and images are `unoptimized`. On NTFS these workarounds may be removable.
- All admin writes happen client-side under Firestore rules — there is no server data layer to "fix" things in; rules ARE the backend boundary.
- Any new data feature must be implemented **twice** (Firebase hook + `-supabase` mirror) or explicitly documented as single-backend, or it silently breaks under the flag (see meetups).
- The security "council" passes left in-code documentation of accepted risks — check file headers/comments before "fixing" something that's a documented tradeoff.

---

*Detailed source reports (timeline, structure, frontend, backend, assets, audit) archived at `C:\Claude Code\.ayms-map\`.*
