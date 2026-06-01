---
phase: 01-precise-tolls-end-to-end-web
reviewed: 2026-06-01T00:00:00Z
depth: standard
files_reviewed: 15
findings:
  critical: 1
  warning: 2
  info: 4
  total: 7
status: resolved
fixed: [CR-01, IN-04, WR-01]
deferred: [WR-02, IN-03, IN-01, IN-02]
fix_commit: 925236c
---

# Phase 1: Code Review Report

**Reviewed:** 2026-06-01 · **Depth:** standard · **Files:** 15 · **Status:** issues-found

## Summary

Security posture is solid: `TOLLGURU_API_KEY` is read only via `ConfigService`, used only in
the `x-api-key` request header, never serialized (e2e asserts non-leakage — TOLL-06 met). The
outbound URL is a hard-coded constant with a server-generated polyline → no SSRF surface. The
never-throw silent-fallback contract (D-03) is correctly funnelled and well tested; the 30-day
cache is correct; the hand-written migration is reversible on Postgres.

The dominant problem is **provenance mislabeling**, which the estimate-primary re-scope (D-07)
makes acute: the default `tollIsEstimate = false` maps to the **"réel"** (precise) badge, so
pre-migration saved trips (all heuristic estimates, since TollGuru was never configured) get
backfilled to `false` and shown to users as a precise price — the opposite of the phase's
"clearly-labelled estimate vs real" intent.

## Critical

### CR-01 — Estimated tolls mislabeled as "réel" via the `false` default
**Files:** `backend/src/database/migrations/1748000000000-AddTollIsEstimateToTrips.ts:9-12`,
`backend/src/trips/entities/trip.entity.ts:131-137`, `backend/src/trips/trips.service.ts:264`,
`web/src/app/app/trips/[id]/page.tsx:279-281`, `web/src/app/app/trips/result/page.tsx:165-167`

Display maps `false → "réel"`, `true → "≈ estimé"`. The migration backfills every existing row
to `false` and `saveTrip` uses `dto.tollIsEstimate ?? false`. Under D-07 (no key, all tolls are
heuristic estimates), pre-migration rows with `tollsCost > 0` render the green **"réel"** badge —
telling users a fabricated estimate is a precise barrier-to-barrier price. Contradicts D-01/D-03
and the Core Value (trustworthy, clearly-labelled cost). **Fix:** backfill existing rows as
estimates (`DEFAULT true`), and default to estimate when a toll is present
(`tollsCost > 0 ? (dto.tollIsEstimate ?? true) : false`).

## Warning

### WR-01 — `handleSave` reads `result` before its lexical declaration
**File:** `web/src/app/app/trips/result/page.tsx:110-112` (decl `:137`)
Latent temporal-dead-zone hazard; works today only because the closure runs post-render. **Fix:**
reference `session.result` consistently inside `handleSave`.

### WR-02 — Non-cached TollGuru failures defeat the rate-safe contract (TOLL-06)
**File:** `backend/src/toll/toll.service.ts:168-177`
Only successful/`hasTolls:false` responses are cached; non-ok/timeout/parse-miss re-hits TollGuru
every request, burning the ~500/mo quota on a persistently-degraded route. **Dormant under D-07
(no key).** **Fix (defer to precise gap-closure):** cache a short-TTL heuristic marker on failure.

## Info

- **IN-01** — `SaveTripDto.energyCost` is a required validated field never read by `saveTrip` (dead required field). Make optional or remove.
- **IN-02** — `Tooltip` trigger/content not linked via `aria-describedby`/`id` (a11y; D-02). Add `useId()` association.
- **IN-03** — `parseTollGuruCost` prefers `route.costs.tag` (télépéage) over `cash`; a cash driver labeled "réel" sees a lower figure. **Dormant under D-07.** Document or prefer cash.
- **IN-04** — Migration `down` uses bare `DROP COLUMN` (not idempotent) while `up` uses `IF NOT EXISTS`. Use `DROP COLUMN IF EXISTS`.

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning | 2 |
| Info | 4 |
| **Total** | **7** |

## Disposition (orchestrator)

- **Fix now** (re-scope-aligned correctness, low risk): CR-01, IN-04 (same migration file), WR-01.
- **Defer to precise gap-closure** (dormant under D-07, only matter once a key exists): WR-02, IN-03.
- **Defer (minor polish):** IN-01, IN-02.

_Reviewer: gsd-code-reviewer · Depth: standard_
