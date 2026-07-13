# LOOP.md — AYMS Improvement Loop

How this repo is operated with loop-engineering patterns
(scaffold from https://github.com/cobusgreyling/loop-engineering, adapted for Cursor).

## Active Loops

### AYMS Admin Improvement Loop (L2 — assisted, in-session)
- **Goal**: see Mission in `STATE.md` — full admin editability, builder UX,
  admin dashboard/CRM with complete analytics/visualization.
- **Cadence**: dynamic (agent-paced). The Cursor agent arms a one-shot wake
  (`AGENT_LOOP_WAKE_AYMS` sentinel from a background sleeper) after each
  iteration; typical heartbeat 15–30 min while work is active.
- **Iteration shape** (six-part loop):
  1. `loop-constraints` — read `loop-constraints.md`, honor kill switch.
  2. Triage (`loop-triage`) — integrate subagent reports, re-read `STATE.md`,
     pick the highest-value item.
  3. Implement (`minimal-fix` for small items; subagents for large builds).
  4. Verify (`loop-verifier` stance): `npm run lint`, `npx tsc --noEmit`,
     manual exercise on http://localhost:5005 where feasible.
  5. Record — update `STATE.md` (check off / re-prioritize) and append to
     `loop-run-log.md`.
  6. Re-arm the next wake (or stop if `loop-pause-all` or backlog empty).

## Skills

Project skills in `.cursor/skills/`: `loop-triage`, `loop-verifier`,
`minimal-fix`, `loop-constraints` (copied/adapted from loop-engineering).

## Safety & Gates

- Binding rules: `loop-constraints.md` (read every iteration).
- No git commits/pushes unless the human explicitly asks.
- No destructive operations against live Firebase/Supabase data.
- Human gate: security-rule changes, dependency majors, anything touching
  payments/legal (e-signature) semantics.

## Budget & Observability

- Caps: `loop-budget.md` · History: `loop-run-log.md`.
- Kill switch: `loop-pause-all: true` in `STATE.md`.

## How to drive manually

In Cursor Agent chat: "Run one AYMS improvement iteration" — or schedule the
same prompt as a Cloud Automation once unattended cadence is wanted.
