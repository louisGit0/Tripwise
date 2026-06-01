---
phase: 01-precise-tolls-end-to-end-web
plan: 04
subsystem: verification / re-scope decision
tags: [tolls, checkpoint, human-verify, re-scope, deferred]
outcome: partial-rescoped
requires:
  - "TollService precise + fallback path (plan 01-01)"
  - "Persisted tollIsEstimate (plan 01-02)"
  - "Web réel/≈ estimé badge + hide-when-0 (plan 01-03)"
provides:
  - "Decision: estimate-primary re-scope; precise TollGuru path built but dormant pending a paid key"
  - "TOLL-01 (precise live) + TOLL-03 (class-1 live) deferred with a documented gap to verify if a key is ever obtained"
checkpoint:
  type: human-verify
  result: rescoped
  blocking_gate: released-by-decision
key-files:
  created: []
  modified: []
decisions:
  - "D-07 (re-scope): TollGuru is paid and a key cannot be obtained — the estimate (heuristic) path is adopted as the primary production mode. The precise TollGuru code stays in place and activates automatically if a key is ever configured."
metrics:
  duration: "~checkpoint"
  completed: 2026-06-01
  tasks: 2
---

# Plan 01-04 — Verification Checkpoint Outcome (Re-scoped)

## Summary

This plan was a **blocking human-verify checkpoint** for the two genuinely
unverifiable areas of the phase: the live TollGuru request/response (Assumptions
A1–A6) and the web toll visuals. During the checkpoint the operator confirmed that
**a TollGuru API key cannot be obtained — the service is paid.**

Per the operator decision, the phase is **re-scoped to estimate-primary**: the
heuristic French-toll estimate becomes the primary production mode. The precise
TollGuru code path remains in the codebase and is designed to activate
automatically the moment a `TOLLGURU_API_KEY` is configured (graceful degradation
was a locked design goal, D-03).

## Checkpoint result

| Task | Verified | Result |
|------|----------|--------|
| Task 1 — live TollGuru precise (Paris→Lyon, A1–A6, cache-on-real) | ❌ not possible | **Deferred** — no paid key |
| Task 1 — no-key estimate fallback (tollIsEstimate=true, no error) | ✅ | Covered by e2e (`reflète le repli heuristique (tollIsEstimate=true)`) |
| Task 2 — amber "≈ estimé" badge + estimate tooltip | ✅ | Code + build verified; estimate state is the live prod state |
| Task 2 — green "réel" badge (needs a real toll) | ❌ not possible | **Deferred** — requires a key to produce a real toll |
| Task 2 — hide-when-0 toll line + grid reflow | ✅ | Implemented (D-04), build green |
| Task 2 — persisted badge on `/app/trips/[id]` | ✅ | Persistence e2e green |

## Evidence (without a key)

- Backend e2e: precise (mocked), heuristic fallback, no-toll, persistence round-trip — all green (140 e2e).
- Web: `tsc --noEmit` clean, `npm run build` 18/18 routes.
- Security: no `TOLLGURU_API_KEY` / `x-api-key` reference anywhere in `web/src` (TOLL-06 key-safety holds).

## Requirements impact

- **Delivered this phase:** TOLL-02 (fallback estimate, now primary), TOLL-04
  (broken-out + total-inclusive + indicator), TOLL-05 (persistence), TOLL-06
  (cache code + key-never-client-side).
- **Deferred (gated on a paid TollGuru key):** TOLL-01 (precise live cost) and
  TOLL-03 (class-1 live verification — request body sends class-1 but is only
  exercised when the precise call fires).

## Open gap (to close if a key is ever obtained)

A future gap-closure plan (`/gsd:execute-phase 1 --gaps-only` or a `1.1` phase)
should run the original Task 1/Task 2 live checks: set a real key, calculate
Paris→Lyon, confirm `tollIsEstimate=false` + ≈ €35–40, cache-hit on repeat, and the
green "réel" badge + TollGuru tooltip. This validates RESEARCH Assumptions A1–A6,
which remain unconfirmed against the real API.

## Notes

- Nothing is broken: the app runs fully in estimate mode today.
- The "réel" vs "≈ estimé" dual-state UI is kept intentionally (future-proof) —
  in production every toll currently renders as "≈ estimé".
