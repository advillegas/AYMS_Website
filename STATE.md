# Loop State — AYMS_Website (Amigas Y Más Social)

Last run: 2026-07-12T08:50-07:00 (run 18 — capstone build PASSED; loop DORMANT)
Loop mode: DORMANT (autonomous backlog drained; full build green). Wake by
  messaging the agent — triggers: Cursor invoice paid → relaunch dashboard/CRM
  subagent; Firestore rules deploy decision; RLS hardening go-ahead; new
  owner-reported issues.
Kill switch: set `loop-pause-all: true` below and the loop exits on next wake.

loop-pause-all: false

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
- [ ] **Admin dashboard/CRM + activity tracking** — **BLOCKED: Cursor unpaid
      invoice killed the subagent before it started building** (only recharts
      install landed). RELAUNCH after billing is settled.
- [ ] **Deployed Firestore rules look stale** (fix-agent discovery): rules
      say `admin@ayms.com`, code uses `admin@amigasymassocial.com`; dev
      console shows trips permission-denied. Likely root cause of silent
      admin write failures. Human decision: deploy updated rules
      (`firebase deploy --only firestore:rules`) after review.
- [ ] Apply `supabase/events-suppression.sql` manually (only matters if
      Supabase flag flips on; **Firebase is the ACTIVE backend** —
      NEXT_PUBLIC_USE_SUPABASE=false).
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

- Supabase RLS permissive + `media` bucket open ("HARDEN before launch").
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
