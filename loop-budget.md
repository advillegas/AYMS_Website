# Loop Budget — AYMS_Website

## Limits

| Loop | Max iterations/day | Max sub-agent spawns/iteration | Notes |
|------|--------------------|--------------------------------|-------|
| AYMS Admin Improvement | 20 | 3 | dynamic cadence, in-session |

## On budget exceed

1. Stop arming new wakes; finish current item only.
2. Append a budget-exceeded event to `loop-run-log.md`.
3. Escalate in `STATE.md` High Priority.

## Kill switch

- `loop-pause-all: true` in `STATE.md` — loop exits on next wake.
