# Safety Policy — AYMS improvement loop

Least-privilege scopes, denylists, and merge policy for any agent operating
this repo. `loop-constraints.md` at the repo root is the binding runtime copy;
this file is the reference.

## Denylist (never edit without explicit human approval)
- `.env`, `.env.*`, credentials, service accounts
- `firestore.rules`, `storage.rules`, `supabase/` security policies
  (feature-required changes must be minimal and loudly flagged)
- Live-data destructive operations (Firebase project `amigas-y-mas-social`,
  Supabase project) — never delete or bulk-modify production user data

## Merge & git policy
- No auto-merge. No commits or pushes unless the human explicitly asks.
- Work stays in the working tree (or an isolated worktree for unattended
  experiments) until the human reviews.

## Tool / MCP scopes (least privilege)
- `loop-triage`: read-only (repo files, git log, subagent reports).
- `loop-verifier`: read + run lint/typecheck/dev-server; no source edits.
- `minimal-fix` / implementer agents: edit `src/`, `public/`, docs; denylist
  above still applies; no dependency majors without human approval.
- No agent needs payment, email, or external-write MCP access — do not grant.

## Escalation
- 3 failed attempts on one item → stop, record in STATE.md High Priority.
- Ambiguous product decisions (copy, pricing, legal/e-sign semantics) →
  escalate to human, never guess.
- Kill switch: `loop-pause-all: true` in STATE.md.
