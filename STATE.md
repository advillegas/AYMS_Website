# Loop State — AYMS_Website (Amigas Y Más Social)

Last run: 2026-07-12T18:45-07:00 (run 19 — REACTIVATED: billing paid, work
  pushed to origin/main as 852cde6, two subagents in flight)
Loop mode: ACTIVE.
Kill switch: set `loop-pause-all: true` below and the loop exits on next wake.

loop-pause-all: false

## BACKEND CORRECTION (owner, 2026-07-12 evening)

**Supabase is now the LIVE production backend** ("we moved everything to
supabase"). Local `.env.local` flipped to `NEXT_PUBLIC_USE_SUPABASE=true` to
match. Consequences:
- Stale-Firestore-rules item is now LEGACY/low priority.
- Supabase RLS permissive-everywhere is now a PRODUCTION security hole → top
  of watch list.
- `supabase/events-suppression.sql` now REQUIRED (events agent consolidating).
- All new features must implement the Supabase branch as primary.

## Run 19 results (both subagents landed)

- Dashboard/CRM subagent DONE: activity tracking pipeline (page views + 9
  action types, Supabase-primary, fire-and-forget), analytics rebuilt on
  recharts (8 KPIs, 6 chart blocks, live feed), per-member activity pane,
  concierge admin UI w/ status triage. Pushed as 50810b6. OWNER ACTION:
  run `supabase/activity-events.sql` in the SQL editor.
- Events subagent DONE: junk rows were in the Supabase **meetups** table
  (merged into /events feed). qwerty + qwert deleted by agent; trailing
  "qwerty." purged by main agent (0 qwert* remaining, verified live).
  Root causes fixed: RLS-filtered deletes reported fake success (now
  row-count-verified), unapplied suppression SQL let the 15-min cron
  resurrect synced deletes (now cms_config tombstone fallback works even
  before SQL applied), map view had no edit/delete (now full parity),
  meetups now admin-editable. OWNER ACTION: run
  `supabase/events-suppression.sql` when convenient.

## Mission

Patch the holes in admin features and optimize the admin experience:
1. 100% of public site content editable from the admin builder/editor.
2. Admin builder mode UX: fast, obvious, un-clunky.
3. Full admin dashboard/CRM inside the site: user statistics and fully detailed
   quantitative data — every user action and message collected and visualized.

## Architecture facts (from explore agent, 2026-07-11)

- CMS was rebuilt after PROJECT_MAP.md was written: 3 layers = section builder
  (`cms_pages`), structured content domains (`cms_config` via
  `use-site-content.ts`), inline click-to-edit (`cms_config.overrides`).
- Two admin surfaces: `/admin` (site editor, dark) + `/community/admin` (CRM,
  light). Trips/events editable in both.
- Analytics today: `/community/admin/analytics` computes client-side from
  `users`/`messages`/`events` — nothing persisted; NO page-view or action
  tracking; NO marketing analytics; chatbot conversations not logged.
- `concierge_inquiries` has a form + table but NO admin UI.
- `AYMS_compare/` = two older snapshots; `AYMS_Website` is authoritative.

## High Priority

- [x] **Shop merch page can't go live** — DONE (shop-merch subagent):
      root cause = no publish control on Pages list + page has zero saved
      elements (render gate requires content) + failed writes masked by
      optimistic localStorage. Store now reverts on failed writes;
      double-click Draft/Live toggle on Pages badges + both builder
      toolbars w/ tooltip, toasts, empty-page guard. Verified 21/21
      Playwright vs live CMS backend. NOTE for owner: add content to the
      Shop Merch page in the builder, then double-click it Live.
      Architecture note: CMS content persists to Supabase even while
      community data is on Firebase (use-site-content/cms stores write
      via getSupabase() unconditionally).
- [x] **Rich text editor in admin mode** — DONE (RTE subagent): custom
      dependency-free contentEditable editor + floating toolbar (B/I/U,
      em-based sizes, brand fonts, searchable accent/symbol palette, clear
      formatting) on EditableText + builder heading/text blocks. Sanitized
      inline-HTML storage, plain-string back-compat, native Ctrl+Z. 48 unit
      + 36 browser checks passed. Follow-ups queued: rich editor for
      content-panel textareas; InlinePropsPanel shows raw HTML for
      formatted blocks; other builder blocks still plain; EN-only toolbar
      strings.
- [x] **Events page editability** — DONE (fix subagent): seeds/fallbacks
      removed, tombstones stop sync resurrection, synced events + meetups
      deletable in admin and in-place on /events. Needs human interactive QA.
- [x] **Camp page** — DONE (fix subagent): editable CTAs default "Join the
      waitlist" → leads pipeline; sponsor banner section; zero-dep canvas
      cropper in all admin image uploads. Needs human interactive QA.
- [x] **Admin dashboard/CRM + activity tracking** — DONE (run 19 subagent,
      pushed 50810b6; owner must apply supabase/activity-events.sql).
- [x] **Events: admin can edit/remove ALL events; junk qwert* rows purged
      from live DB** — DONE (run 19 subagent + main agent purge; owner
      should apply supabase/events-suppression.sql).
- [ ] ~~Deployed Firestore rules stale~~ — DEPRIORITIZED: Firebase is legacy
      now (Supabase live). Only matters if flag ever flips back.
- [ ] Apply `supabase/events-suppression.sql` — NOW REQUIRED (Supabase live);
      events subagent consolidating; owner runs it in Supabase SQL editor.
- [ ] **Editor coverage gaps** (fix agent landed; patching directly) — from audit:
      1. ~~`/links` page fully hardcoded~~ — DONE (main agent 2026-07-11):
         content moved to `cms_config.links` w/ coded defaults; new
         Admin → Content → "Links page" panel (profile, avatar w/ crop,
         socials, chips, buttons; add/reorder/delete); Pages → Edit routes
         to the panel; tsc + eslint clean.
      2. ~~Destination tiles hardcoded~~ — DONE (main agent 2026-07-11):
         tiles → `cms_config` (`home.destinations.tiles`); new Admin →
         Content → "Destinations" panel (add/remove/reorder, emoji picker,
         gradient presets, cropped photo upload); live trip counts still
         automatic; tsc + eslint clean.
      3. ~~Camp hero `FACTS` list not CRUD-able~~ — DONE (main agent
         2026-07-11): facts → `cms_config` (`camp.facts`); new `CampFacts`
         component with in-place "Edit facts" dialog (add/remove/reorder,
         icon picker from SECTION_ICONS, relabel), same pattern as camp CTA
         editor. NOTE: old per-fact inline overrides (`camp.fact.N`) no
         longer render; defaults match previous live text.
      4. ~~Footer links partly hardcoded~~ — DONE (main agent 2026-07-11):
         columns → `cms_config` (`footer.columns`); new `FooterColumns`
         component with in-place "Edit links" dialog (columns + links CRUD,
         reorder, headings/labels/URLs). NOTE: old `home.footer.col.*`
         inline overrides no longer render; defaults match previous text.
      5. ~~Privacy/Terms static~~ — DONE (main agent 2026-07-12): copy moved
         into client `PrivacyBody`/`TermsBody` where EVERY heading/paragraph/
         list item is click-to-edit (overrides `privacy.*`/`terms.*`; rich
         text supported; contact email + IG handle pull from Site Settings).
         Pages added to admin Pages list + in-place edit routing; floating
         Edit bar enabled on /privacy + /terms; /links Edit-bar shortcut →
         its content panel. Metadata/SEO strings stay coded.
      6. ~~Chatbot knowledge hardcoded~~ — DONE (main agent 2026-07-12 run
         15): `chatbot-knowledge.ts` was ORPHANED dead code w/ dangerously
         stale trip data — deleted. The real bot (api/chat + system prompt)
         already injects live trips/events; NEW: Admin → Content → Chatbot
         panel writes `cms_config.chatbot.extraKnowledge` (8k cap, draft
         autosave), appended to the system prompt as authoritative owner
         notes at request time — owner can correct/extend the bot without
         deploys.
      7. ~~Sitemap missing `/links`, `/concierge`~~ — DONE (added 2026-07-11).
- [ ] **Builder UX overhaul** — mostly done (main agent 2026-07-12 run 14):
      ~~unify/link the two admin surfaces~~ (sidebar "Community CRM" link in
      /admin; "Site editor" tile first on /community/admin); ~~default admin
      tab lands on "content"~~ (now lands on Pages = builder front door);
      ~~camp-page edit routing quirk~~ (camp/privacy/terms all route to
      in-place edit, run 13); ~~Leads backend label wrong under Supabase~~
      (new shared BackendBadge names the ACTIVE backend; leads + members
      pages converted, copy made backend-neutral). ~~version history~~ —
      FIXED (run 16): snapshots were gated on useSupabaseBackend (false in
      prod) while the Revert UI always read Supabase → picker was
      permanently empty on production. Now snapshots write whenever the
      Supabase client exists (version storage is Supabase-only by design;
      cms-hardening.sql created the table). Restore still writes through
      the active backend. First snapshot appears on next publish.

## Watch List

- **Supabase RLS permissive + `media` bucket open — NOW URGENT: Supabase is
  the live production backend.** Anyone with the public anon key can write/
  delete community + CMS data. Needs owner go-ahead for a hardening pass
  (policies exist in supabase/cms-hardening.sql as a starting point).
- `builder-store.ts` still has localStorage-only template/publish keys.
- Agreement legal templates still PLACEHOLDER (`src/lib/agreements-data.ts`).
- ~~meetups missing from Supabase schema~~ — table exists now (verified).
- Unoptimized images (~6.7 MB), no tests/CI.
- ~~221 tracked `._*` files~~ — untracked in run 17 (`git rm --cached`,
  deletions left STAGED for owner review/commit; `._*` already ignored).
- ~~README boilerplate~~ — rewritten in run 17 (real stack/admin/CMS docs,
  correct dev port 5005, ops notes incl. rules-deploy + RLS warnings).

## Recent Noise (ignored this run)

- `/play` quiz remnants (`game-data.ts`) — orphaned but harmless.

---
Run log: loop-run-log.md · Cadence & gates: LOOP.md · Binding rules: loop-constraints.md
