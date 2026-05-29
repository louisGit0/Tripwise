---
phase: 01-precise-tolls-end-to-end-web
plan: 01
subsystem: backend / trips + toll
tags: [tolls, tollguru, nestjs, service-extraction, caching, tdd]
requires:
  - "MapboxService.getDirections (GeoJSON LineString geometry)"
  - "ConfigService (TOLLGURU_API_KEY, server-side only)"
provides:
  - "TollService.computeTollCost(coordinates, distanceKm, durationSeconds) → { cost, isEstimate } | null"
  - "TollModule (exports TollService)"
  - "POST /trips/calculate returns tollCost + tollIsEstimate"
affects:
  - "TripsService (toll logic removed, delegates to TollService)"
  - "TripsModule (imports TollModule)"
tech-stack:
  added: []
  patterns:
    - "External-API service idiom: native fetch + AbortSignal.timeout(8000) + in-memory Map cache + silent fallback (mirrors FuelPricesService)"
    - "Zero-dependency Google polyline encoder (precision 6) for source:mapbox"
    - "Defensive multi-path response parse (route.costs.{tag,cash,minimumTollCost} + legacy summary.costs)"
key-files:
  created:
    - backend/src/toll/toll.service.ts
    - backend/src/toll/toll.module.ts
    - backend/src/toll/toll.service.spec.ts
  modified:
    - backend/src/trips/trips.service.ts
    - backend/src/trips/trips.module.ts
    - backend/src/trips/trips.service.spec.ts
    - backend/test/trips.e2e-spec.ts
decisions:
  - "D-03 silent heuristic fallback on any TollGuru failure/timeout/missing key — never throws"
  - "D-05 send the full Mapbox route polyline (barrier-to-barrier), not O/D"
  - "D-06 30-day TTL in-memory cache keyed by SHA-1(polyline)"
  - "No new dependency: inline precision-6 encoder instead of @mapbox/polyline"
metrics:
  duration: "~25min"
  completed: 2026-05-29
  tasks: 3
  files: 7
  commits: 3
---

# Phase 1 Plan 01: Backend Toll Engine Summary

Extracted a focused `TollService` from the 726-line `TripsService` that calls TollGuru along the full Mapbox route polyline, parses the cost defensively, caches results 30 days by polyline hash, and degrades silently to the French heuristic on any failure — turning the partial/broken toll branch into a trustworthy `{ cost, isEstimate } | null` value that flows out of `POST /trips/calculate`.

## What Was Built

- **`TollService`** (`backend/src/toll/toll.service.ts`): `@Injectable` service mirroring the `FuelPricesService` external-API idiom.
  - `computeTollCost(coordinates: [lng,lat][], distanceKm, durationSeconds)` — the public, drop-in contract.
  - Precise path: `POST https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service` with `{ source:'mapbox', polyline, vehicle:{ type:'2AxlesAuto' }, currency:'EUR' }`, `x-api-key` header, `AbortSignal.timeout(8000)`.
  - Zero-dependency precision-6 Google polyline encoder (lat-then-lng) — keeps the route map's GeoJSON geometry intact; no `@mapbox/polyline` added.
  - Defensive cost parse: `route.costs.{tag,cash,minimumTollCost}` then legacy `summary.costs.{tag,cash}`; `route.hasTolls === false` → real `{ cost:0, isEstimate:false }`.
  - 30-day in-memory `Map` cache keyed `toll:class1:<sha1(polyline)>`; an identical repeated route is served from cache (one `fetch`).
  - Silent fallback (`logger.warn` once, never throw) on no-key / 401 / 429 / 5xx / timeout / JSON-parse-failure / no-cost-path → `estimateFrenchTolls` `{ isEstimate:true }` or `null`.
- **`TollModule`** — no controller; `providers:[TollService]`, `exports:[TollService]` (ConfigModule is global).
- **`TripsService` wiring** — injects `TollService`, calls `this.toll.computeTollCost(directions.geometry.coordinates, distanceKm, directions.durationSeconds)` inside the existing `Promise.all` (reuses the already-computed geometry, no Mapbox re-fetch). `computeTollCost`/`estimateFrenchTolls` deleted; the now-unused `ConfigService` injection removed. Result mapping (`tollCost`/`tollIsEstimate`) unchanged.
- **Tests** — `toll.service.spec.ts` (18 cases: precise, no-toll, class-1 body, cache, all fallback modes, heuristic speed-bands + null). `trips.e2e-spec.ts` extended with 4 toll-contract assertions (real / heuristic / null + no key leak).

## Verification

| Check | Result |
|-------|--------|
| `npx jest src/toll/toll.service.spec.ts` | ✅ 18/18 |
| `npx jest src/trips/trips.service.spec.ts` | ✅ 19/19 |
| `npx jest --config test/jest-e2e.json --testPathPatterns="trips"` | ✅ 63/63 (2 suites) |
| Full backend unit suite | ✅ 38/38 (3 suites) |
| Full backend e2e suite | ✅ 140/140 (9 suites, was 136) |
| `npx tsc --noEmit` | ✅ clean |
| `npm run build` (`nest build`) | ✅ clean |

## TDD Gate Compliance

- RED: `test(01-01)` commit `3fc3b00` — spec failed against the skeleton (16 fail / 2 pass).
- GREEN: `feat(01-01)` commit `ab3c3c1` — 18/18 pass.
- Wire + e2e: `feat(01-01)` commit `c2fb916`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired pre-existing broken `trips.service.spec.ts` DI**
- **Found during:** Task 3 (after swapping `ConfigService`→`TollService` in the `TripsService` constructor).
- **Issue:** The unit spec never provided `TripRepository`, `UserVehicleRepository`, or `ConfigService`, so `Test.createTestingModule().compile()` already threw `Nest can't resolve dependencies of TripsService (?, …)` — verified against the committed service via `git stash`. CLAUDE.md's "19 tests passing" claim was stale; the spec was non-functional before this plan.
- **Fix:** Added mock providers for `getRepositoryToken(Trip)`, `getRepositoryToken(UserVehicle)`, and a `TollService` stub (`computeTollCost → null`). The file is in this plan's `files_modified` and Task 1's file list, and my Task 3 constructor change touched its dependency graph, so the repair is in scope.
- **Files modified:** `backend/src/trips/trips.service.spec.ts`
- **Commit:** `c2fb916`
- **Result:** 19/19 now genuinely green.

**Note — "move heuristic cases from `trips.service.spec.ts`":** The plan (Task 1) asked to move heuristic test cases out of `trips.service.spec.ts`. That file contained **no** toll/heuristic tests, so there was nothing to move; the heuristic cases were authored fresh in `toll.service.spec.ts` (speed-bands 0.70/0.45/0.20, low-speed → 0, distance<5 / duration=0 → null). The "removed from trips.service.spec.ts" acceptance is vacuously satisfied.

## Requirement Coverage (API/engine level)

This plan delivers the **backend engine** for these requirements; their full vertical slice completes in later plans. The REQUIREMENTS.md checkboxes are intentionally left unchecked until then.

| Req | This plan delivers | Remaining (later plan) |
|-----|--------------------|------------------------|
| TOLL-01 (precise via TollGuru) | Polyline endpoint call + defensive parse → `isEstimate:false` | ⚠️ Live verification with a real key (Paris→Lyon ≈ €37) — plan 01-04 |
| TOLL-02 (heuristic fallback) | Silent fall-through on every failure mode (unit-tested), `isEstimate:true` | "≈ estimé" badge in UI — plan 01-03 |
| TOLL-03 (class-1 car) | `vehicle.type:'2AxlesAuto'` in request body (e2e/unit asserted) | (live confirm enum string — 01-04) |
| TOLL-06 (cached + key server-side) | 30-day SHA-1 polyline cache; e2e asserts no key leaks into response | Durable cache deferred to V2 (in-memory accepted, CONCERNS) |

## Known Stubs

None. (The precise TollGuru path is real code; only its live network behavior — endpoint/response-shape/precision per RESEARCH A1–A6 — is unverified this session because no `TOLLGURU_API_KEY` is available. With no key it correctly degrades to the heuristic by design.)

## Self-Check: PASSED

- Files: `backend/src/toll/toll.service.ts`, `toll.module.ts`, `toll.service.spec.ts` — FOUND.
- Commits `3fc3b00`, `ab3c3c1`, `c2fb916` — present in `git log`.
- Full backend unit (38) + e2e (140) green; tsc + build clean.
