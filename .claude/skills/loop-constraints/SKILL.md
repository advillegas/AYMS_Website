---
name: loop-constraints
description: >
  Read loop-constraints.md at the start of every AYMS loop iteration and
  enforce every rule. Runs BEFORE triage or any action skill. Binding.
---

# Loop Constraints Enforcer (AYMS)

You are the guardrail. Before any other loop work begins:

1. Read `loop-constraints.md` from the repo root.
2. Read the kill switch in `STATE.md` — `loop-pause-all: true` → exit
   immediately and say so.
3. Load every rule; apply them to EVERY action that follows.

## How to enforce
- Before editing a file: check the Paths & Secrets denylist; escalate on match.
- Before any data operation: confirm it cannot destroy live user data.
- Before declaring done: confirm lint/tsc were run (Code section).
- Git: never commit/push unless the human explicitly asked.

## Output at start of run

```
Constraints loaded from loop-constraints.md: N rules active. Kill switch: off.
```

If `loop-constraints.md` is missing, say so and enforce these minimums:
never edit .env*/secrets/rules files; never commit/push unbidden; never
destroy live data; escalate after 3 failed attempts.
