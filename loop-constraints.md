# Loop Constraints — AYMS_Website

> The `loop-constraints` skill reads this file at the start of every run.
> Constraints here are **binding** — the agent MUST follow them.

## Git
- Never `git commit` or `git push` unless the human explicitly asks.
- Never rewrite history. Leave work in the working tree for review.

## Paths & Secrets
- Never edit `.env`, `.env.*`, credentials, or service-account material.
- Never edit `firestore.rules`, `storage.rules`, or `supabase/*` security
  policies except when a feature strictly requires it — then keep the change
  minimal and flag it loudly for human review.
- Never delete user data or run destructive operations against the live
  Firebase project (`amigas-y-mas-social`) or the live Supabase project.

## Code
- Check `.env.local` `NEXT_PUBLIC_USE_SUPABASE` to learn the ACTIVE backend.
  Every data feature must work on the active backend; mirror to the other
  when practical or record the gap in STATE.md.
- Read `AGENTS.md`: Next.js 16 post-dates model training — consult
  `node_modules/next/dist/docs/` before using unfamiliar Next APIs.
- Verify before calling anything done: `npm run lint` + `npx tsc --noEmit`;
  exercise changed UI on http://localhost:5005 when feasible.
- Never disable tests, lint rules, or TS checks to get green.
- Respect in-code "council" comments documenting accepted security tradeoffs —
  don't "fix" documented decisions without human sign-off.
- One focused change-set per item; max 3 fix attempts, then escalate in STATE.md.

## Communication
- Record every iteration in `loop-run-log.md`; keep `STATE.md` current.
- Escalate ambiguity or high-risk decisions to the human in STATE.md
  (High Priority section) rather than guessing.

## Budget
- If `loop-pause-all: true` in STATE.md → exit immediately.
- If an iteration exceeds ~3 subagent spawns or stalls twice on the same
  item → switch to report-only and escalate.

---
<!-- Repo-specific rules above. Add your own below. -->
