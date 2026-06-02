---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 04
subsystem: backend / vehicle catalog ingestion
tags: [catalog, merge, idempotency, on-conflict, adapters, tdd]
requires:
  - "04-01: vehicle_models.source + canonical UNIQUE(brand,model,fuel_type) @Index"
  - "04-02: CatalogSourceAdapter contract + AdemeAdapter + EpaAdapter + EPA snapshot"
provides:
  - "VehicleSyncService = precedence-ordered orchestrator over CatalogSourceAdapter[]"
  - "mergeCanonical(adapters): DB-agnostic first-writer-wins merge (exported, unit-tested)"
  - "Idempotent batched ON CONFLICT upsert (ADEME DO UPDATE / EPA DO NOTHING)"
affects:
  - "04-05: showroom consumes the now-thousands catalog via the 04-03 search API"
tech-stack:
  added: []
  patterns:
    - "Precedence-sorted first-writer-wins Map keyed by uppercased brand|model|fuelType"
    - "TypeORM QueryBuilder .insert().orUpdate([...],[conflict]) / .orIgnore() batches of 100"
    - "Auto-bootstrap sync gated by STARTUP_THRESHOLD + skipped under NODE_ENV=test"
key-files:
  created:
    - backend/src/vehicles/adapters/catalog-merge.spec.ts
  modified:
    - backend/src/vehicles/vehicle-sync.service.ts
decisions:
  - "Keep public method named syncFromAdeme (now multi-source) so the 04-03 POST /vehicles/sync controller route needs no change"
  - "Skip auto-bootstrap sync under NODE_ENV=test — orUpdate would overwrite seeded fixtures via the live ADEME fetch"
  - "STARTUP_THRESHOLD=500 retained: prod (~266 ADEME) is below it so the one-time multi-source population runs on next deploy, then boots skip"
metrics:
  duration: ~14min
  tasks: 2
  files: 2
  completed: "2026-06-02"
---

# Phase 4 Plan 04: Multi-Source Merge Orchestrator + Idempotent Upsert Summary

Generalized the single-source ADEME sync into a precedence-ordered, idempotent multi-source merge orchestrator: `VehicleSyncService` now iterates `[AdemeAdapter, EpaAdapter]` (sorted by `precedence`) through a first-writer-wins `Map` (ADEME wins on overlap, EPA gap-fills) and persists via batched `ON CONFLICT` upsert (ADEME `DO UPDATE`, EPA `DO NOTHING`) on the canonical `UNIQUE(brand,model,fuel_type)` — resolving DEF-04-01-01 and making re-runs idempotent (CAT-03/CAT-05).

## What Was Built

### Task 1 — Precedence merge orchestrator + spec (TDD RED→GREEN)
- **`catalog-merge.spec.ts`** (new) — 7 DB-agnostic cases driven by hand-written stub adapters: ADEME-precedence first-writer-wins (PD4-1), EPA gap-fill, case-insensitive (uppercased) key collision, precedence independent of array order, idempotency (twice → identical set), 3rd-adapter extensibility (precedence 20 adds exactly its new key), null-skip.
- **`mergeCanonical(adapters: CatalogSourceAdapter[]): Promise<CanonicalVehicle[]>`** (exported) — sorts by `precedence` ascending, runs each adapter's `load()` + `normalize()` (skipping nulls) into a `Map` keyed by `` `${brand}|${model}|${fuelType}`.toUpperCase() `` with `if (!map.has(key)) map.set(key, v)` first-writer-wins.
- `doSync()` rewired to build `[new AdemeAdapter(), new EpaAdapter()]` → `mergeCanonical`. All inlined ADEME fetch/normalize/helpers removed (now owned by `AdemeAdapter`, 04-02). `OnApplicationBootstrap` + `STARTUP_THRESHOLD` + `isSyncing` guard preserved.
- Commits: `126d97d` (test/RED, 6 failing) → `03968a4` (feat/GREEN, 7/7).

### Task 2 — Batched ON CONFLICT upsert + provenance
- `doSync()` splits the merged set by `source`: ADEME rows upsert with `.orUpdate(['consumption','battery_capacity_kwh','tank_capacity_liters','source'], ['brand','model','fuel_type'])`; EPA rows with `.orIgnore()` (ON CONFLICT DO NOTHING — never overwrites ADEME, PD4-1; belt-and-suspenders since the in-memory merge already dropped EPA overlaps). Batches of `BATCH_SIZE=100` via `createQueryBuilder().insert().into(VehicleModel)`.
- Every row carries its `source` provenance + `year: null` (canonical key excludes year). `SyncResult { created, skipped, total }` shape preserved (`created` = net new rows via before/after `count()`); logged via `this.logger` (no `console.log`, per CLAUDE.md).
- **DEF-04-01-01 resolved** — the legacy `repo.save()` UNIQUE collision is gone; the canonical index is the conflict target + idempotency safety net.
- Commit: `7f5b511` (feat).

## STARTUP_THRESHOLD interaction (documented in-code)
`STARTUP_THRESHOLD=500` retained. Production currently holds ~266 ADEME rows (< 500), so on the **next deploy** the boot count is below the threshold and the **full multi-source sync runs ONCE**, growing the catalog to thousands. Every subsequent boot sees count ≥ 500 and skips — no expensive per-boot re-syncs. The manual `POST /vehicles/sync` route (unchanged) refreshes the catalog on demand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Skip auto-bootstrap sync under NODE_ENV=test**
- **Found during:** Task 2 verification (full e2e — `trips.e2e-spec.ts` electric-cost tests failed: consumptionKwh 64.8 vs expected 67.05).
- **Issue:** The trips e2e seeds `Tesla Model 3 ELECTRIC @ 14.9`. With the new ADEME `orUpdate` (DO UPDATE), the background bootstrap sync's **live ADEME fetch** overwrote the seeded consumption (14.9 → 14.4) on the canonical key collision. The old insert-only path left existing rows untouched, so the tests passed before.
- **Fix:** Gate `onApplicationBootstrap` to return early when `process.env.NODE_ENV === 'test'`. This both fixes the regression and removes a hidden live-network dependency from the e2e suite (improvement). Merge correctness is proven by `catalog-merge.spec.ts`; runtime upsert path is covered by the manual sync endpoint.
- **Files modified:** `backend/src/vehicles/vehicle-sync.service.ts`
- **Commit:** `7f5b511`

## Verification

| Check | Result |
|-------|--------|
| `npx jest src/vehicles/adapters/catalog-merge.spec.ts` | ✅ 7/7 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` (nest build) | ✅ clean |
| `npx jest --config test/jest-e2e.json --forceExit` (full) | ✅ 150/150 (9 suites) |
| vehicles e2e (search/brands — 04-03 contract) | ✅ 31/31, unchanged |

## Threat Surface

No new surface beyond the plan's `<threat_model>`. Mitigations applied:
- **T-04-04-01** (cross-source dupes): DB `UNIQUE(brand,model,fuel_type)` conflict target + EPA `.orIgnore()` (DO NOTHING) — EPA can never overwrite ADEME.
- **T-04-04-02** (DoS / unbounded insert): batched inserts of 100; merge Map bounded by deduped source sets; `STARTUP_THRESHOLD` skips redundant boot syncs.
- **T-04-04-03** (bad ADEME data): `AdemeAdapter.normalize` skip-on-missing (04-02); idempotent upsert means a partial/failed run is safely re-runnable.

## Self-Check: PASSED

- FOUND: backend/src/vehicles/adapters/catalog-merge.spec.ts
- FOUND: backend/src/vehicles/vehicle-sync.service.ts (mergeCanonical exported, orUpdate/orIgnore present)
- FOUND commit: 126d97d (test/RED)
- FOUND commit: 03968a4 (feat/GREEN merge)
- FOUND commit: 7f5b511 (feat ON CONFLICT upsert)
