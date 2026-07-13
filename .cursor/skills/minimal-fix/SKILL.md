---
name: minimal-fix
description: >
  Produce the smallest possible code change that fixes one specific,
  well-scoped AYMS issue (bug, editor gap, UX papercut). Use only when the
  fix target is explicit. Never refactor unrelated code.
---

# Minimal Fix Skill (AYMS)

Fix **one specific problem** with the **smallest diff** that could work.

## Process
1. Reproduce or confirm the problem (dev server on :5005 when feasible).
2. Identify the minimal root cause — not symptoms in distant files.
3. Change only what is required. No drive-by refactors.
4. Respect the dual-backend pattern: data changes must work on the ACTIVE
   backend (`NEXT_PUBLIC_USE_SUPABASE` in .env.local); mirror or record gap.
5. Run `npm run lint` + `npx tsc --noEmit`.
6. Summarize: what changed, why, what you ran.

## Output

```markdown
## Minimal Fix Proposal
### Target
(one sentence)
### Diff summary
(files + what changed)
### Verification run
(commands + results)
### Risks / human review needed?
(yes/no + why)
```

## Rules
- One problem per invocation; multiple failures → back to triage.
- Respect `loop-constraints.md` denylist paths — escalate instead of editing.
- Do not mark your own work done — the verifier decides.
