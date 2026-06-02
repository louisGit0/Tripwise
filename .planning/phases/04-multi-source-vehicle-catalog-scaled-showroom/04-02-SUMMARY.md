---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 02
subsystem: backend / catalog ingestion
tags: [adapter, etl, epa, ademe, unit-conversion, tdd, snapshot, csv, fuel-mapping]

# Dependency graph
requires:
  - phase: 04-01 (schema foundation)
    provides: canonical UNIQUE(brand, model, fuel_type) + source provenance column the merge upsert targets
provides:
  - "CatalogSourceAdapter interface + CanonicalVehicle contract — the CAT-05 extensibility spine 04-04 consumes"
  - "conversions.ts: mpgToLper100km (235.214583/MPG), combEToKwhPer100km (combE/1.609344), epaFuelToType (EPA label -> {FuelType, metric})"
  - "AdemeAdapter (source='ademe', precedence=0) + EpaAdapter (source='epa', precedence=10)"
  - "committed ;-delimited EPA snapshot (26749 allow-listed rows, 1.86 MB) + build-epa-snapshot.ts reproducer"
affects: [04-04 merge orchestrator, 05 mobile catalog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source adapters behind one CatalogSourceAdapter contract (load + normalize + source + precedence) — a 3rd source drops in with no merge/schema change"
    - "epaFuelToType returns the metric to read ('mpg' vs 'combE') so combE never runs through the MPG formula (Pitfall 3)"
    - "Committed trimmed ;-delimited snapshot parsed at sync time with readline split(';') — zero new dependency (PD4-3)"
    - "Shared name helpers (toTitleCase/normalizeBrand/normalizeModel/UPPERCASE_BRANDS) exported from ademe.adapter, imported by epa.adapter (DRY, stays within the planned file set)"
    - "TDD RED->GREEN: failing conversions.spec committed before the implementation"

key-files:
  created:
    - "backend/src/vehicles/adapters/catalog-source-adapter.interface.ts"
    - "backend/src/vehicles/adapters/conversions.ts"
    - "backend/src/vehicles/adapters/conversions.spec.ts"
    - "backend/src/vehicles/adapters/ademe.adapter.ts"
    - "backend/src/vehicles/adapters/epa.adapter.ts"
    - "backend/src/scripts/build-epa-snapshot.ts"
    - "backend/src/data/epa-vehicles.snapshot.csv"
  modified:
    - "backend/nest-cli.json"

key-decisions:
  - "E85/FFV -> SP95 (plan action), not E85 — keeps one canonical gasoline row, mirrors ADEME"
  - "CanonicalVehicle keeps NO year field (locked contract); EPA per-row year is dropped (canonical key excludes year; 04-04 does not key on it)"
  - "nest-cli.json copies data/**/*.csv to dist so EpaAdapter finds the snapshot at runtime (Rule 2)"
  - "EPA_BRAND_ALLOWLIST authoritative in epa.adapter; build-epa-snapshot.ts holds a build-time copy of the make set"
  - "Conservative trim-strip: drop only trailing drivetrain/displacement tokens (xDrive*, 4MATIC, AWD, 2.0T...), always keep >=1 token; 4-digit years NOT stripped"

requirements-completed: [CAT-01, CAT-02, CAT-04, CAT-05]

# Metrics
duration: 8min
completed: 2026-06-02
---

# Phase 4 Plan 02: Multi-Source Ingestion Spine (Adapters + EPA Snapshot) Summary

**A `CatalogSourceAdapter` contract + `CanonicalVehicle` shape, two unit-tested EPA conversions and the EPA→FuelType map, an `AdemeAdapter` extracted from the existing sync, and an `EpaAdapter` that stream-parses a committed, trimmed, `;`-delimited EPA snapshot (26749 FR-relevant rows) — every consumption traced to a real source metric, nothing fabricated.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-02T11:52:38Z
- **Completed:** 2026-06-02T12:00:39Z
- **Tasks:** 3 (Task 1 = TDD RED→GREEN)
- **Files:** 8 (7 created, 1 modified)

## Accomplishments
- **CAT-05 extensibility contract:** `CatalogSourceAdapter` (load + normalize + source + precedence) + `CanonicalVehicle` — a 3rd source is added by implementing the interface and picking a precedence, with no change to the merge loop or schema.
- **CAT-02 conversions (unit-proven, TDD):** `mpgToLper100km = 235.214583/MPG`, `combEToKwhPer100km = combE/1.609344` (1 decimal, `null` on ≤0), and `epaFuelToType` that returns `{ fuelType, metric }` so EVs read `combE` and ICE reads `comb08` — combE can never run through the MPG formula (Pitfall 3). 19/19 spec green.
- **EPA→FuelType map:** gasoline grades → SP95, Diesel → DIESEL, Electricity/EV → ELECTRIC, PHEV/Hybrid → primary combustion fuel (one row, mirrors ADEME), FFV/E85 → SP95, CNG/Hydrogen/Fuel Cell → `null` (skip).
- **CAT-01 adapters:** `AdemeAdapter` (extracted, output identical in shape to today's sync) + `EpaAdapter` (allow-list filter, Mercedes-Benz→Mercedes alias, conservative trim-strip, skip on missing make/fuel/metric).
- **CAT-04 / PD4-3 snapshot:** `build-epa-snapshot.ts` downloaded fueleconomy.gov, trimmed to the 9 needed columns + allow-listed makes, and emitted a `;`-delimited snapshot (26749 rows, 1.86 MB, provenance header) parsed at sync time with `readline` + `split(';')` — **no csv-parse dependency, no embedded-comma pitfall.**
- **No new runtime dependency**; `npx tsc --noEmit` + `npx nest build` clean; snapshot copied to `dist/data`.

## Task Commits

1. **Task 1 RED — failing conversions + EPA fuel-map spec + contract** — `9f7e1d0` (test)
2. **Task 1 GREEN — conversions + epaFuelToType implementation** — `2a893ab` (feat)
3. **Task 2 — snapshot builder + committed trimmed snapshot** — `36e3c5e` (feat)
4. **Task 3 — AdemeAdapter + EpaAdapter behind the contract** — `fc5631c` (feat)

## Files Created/Modified
- `catalog-source-adapter.interface.ts` — `CanonicalVehicle` + `CatalogSourceAdapter` exactly per the locked `<interfaces>` block.
- `conversions.ts` — named constants `235.214583` / `1.609344`, the two conversions, `epaFuelToType`.
- `conversions.spec.ts` — 19 AAA cases (worked examples + null guards + the full fuel map incl. PHEV/CNG/Hydrogen).
- `ademe.adapter.ts` — ADEME load/normalize moved out of the sync service; exports shared name helpers.
- `epa.adapter.ts` — snapshot stream-parse, `EPA_BRAND_ALLOWLIST`, trim-strip, conversion dispatch by metric, skip-on-bad.
- `scripts/build-epa-snapshot.ts` — one-time dev tool (inline RFC-4180 quote-aware reader; `console.log` allowed in `src/scripts`).
- `data/epa-vehicles.snapshot.csv` — committed; provenance header + 9 `;`-delimited columns, allow-listed makes only.
- `nest-cli.json` — added `data/**/*.csv` to assets (runtime snapshot resolution).

## Decisions Made
- **FFV/E85 → SP95** (followed the plan `<action>`'s "FFV/E85 → SP95" over the RESEARCH table's conditional E85), so each FFV stays one canonical gasoline row and matches ADEME.
- **`CanonicalVehicle` has no `year`** — the locked contract (a must-have) excludes year; the canonical key excludes year too. EPA's per-row year is dropped rather than bolted onto the contract the merge consumes.
- **`nest-cli.json` asset copy** — the EpaAdapter resolves `../../data` from `__dirname` (= `dist/data` at runtime); without copying the snapshot it would `ENOENT` in 04-04. Added as critical functionality (Rule 2).
- **Allow-list duplicated build-time vs runtime** — the authoritative `EPA_BRAND_ALLOWLIST` lives in `epa.adapter.ts`; the one-time builder keeps its own make set so the throwaway script needs no import from `src/vehicles`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] fueleconomy.gov returned HTTP 406 on download**
- **Found during:** Task 2 (first snapshot build run)
- **Issue:** `fetch` with `Accept: text/csv` was rejected with HTTP 406 Not Acceptable.
- **Fix:** Send `Accept: */*` + a descriptive `User-Agent`; download then succeeded (20.6 MB raw → 1.86 MB trimmed).
- **Files modified:** `backend/src/scripts/build-epa-snapshot.ts`
- **Commit:** `36e3c5e`

**2. [Rule 2 - Missing critical functionality] snapshot absent from dist build**
- **Found during:** Task 3
- **Issue:** `nest build` did not copy `src/data/*.csv` to `dist/`; the EpaAdapter's `__dirname`-relative path would fail at runtime.
- **Fix:** Added `{ "include": "data/**/*.csv", "watchAssets": true }` to `nest-cli.json` assets; verified `dist/data/epa-vehicles.snapshot.csv` after `nest build`.
- **Files modified:** `backend/nest-cli.json` (outside the plan's `files_modified`)
- **Commit:** `fc5631c`

### Contract-faithfulness adjustments
- **EPA `year` not emitted** — the plan `<action>` says "year from the row", but the locked `CanonicalVehicle` (must-have truth) has no `year` field. The locked contract wins; year is documented as dropped metadata in `epa.adapter.ts`.

**Total deviations:** 3 (2 auto-fixed, 1 contract-faithfulness). **Impact:** none on scope — all three tasks landed as specified; the merge refactor of `vehicle-sync.service.ts` remains correctly deferred to 04-04 (that file was not modified).

## Issues Encountered
None blocking. The EPA make set in the snapshot builder and the adapter's `EPA_BRAND_ALLOWLIST` must be kept in sync if the allow-list is tuned later (documented in both files).

## Verification
- `npx jest src/vehicles/adapters/conversions.spec.ts` → 19/19 green (RED→GREEN proven)
- `npx tsc --noEmit` → 0 errors
- `npx nest build` → clean; `dist/data/epa-vehicles.snapshot.csv` present
- Snapshot: 26749 allow-listed rows, 1.86 MB (< 10 MB), provenance header line 1, every row 9 `;`-fields (no misalignment)
- Hand-trace of `EpaAdapter.normalize`: gas comb08 25 → 9.4 SP95; EV combE 30 → 18.6 ELECTRIC (Mercedes-Benz→Mercedes); diesel-PHEV comb08 50 → 4.7 DIESEL; non-allow-listed make / CNG / comb08=0 all → `null`

## Next Phase Readiness
- **04-04 (merge orchestrator):** instantiate `[new AdemeAdapter(), new EpaAdapter()]`, sort by `precedence`, run first-writer-wins into a Map keyed by `brand|model|fuelType` (uppercased), then batched `ON CONFLICT` upsert (ADEME `orUpdate`, EPA `orIgnore`). Replace `VehicleSyncService.doSync`'s `repo.save()` (DEF-04-01-01).
- No blockers.

## Self-Check: PASSED

- FOUND: `backend/src/vehicles/adapters/catalog-source-adapter.interface.ts`
- FOUND: `backend/src/vehicles/adapters/conversions.ts`, `conversions.spec.ts`
- FOUND: `backend/src/vehicles/adapters/ademe.adapter.ts`, `epa.adapter.ts`
- FOUND: `backend/src/scripts/build-epa-snapshot.ts`
- FOUND: `backend/src/data/epa-vehicles.snapshot.csv`
- FOUND commits: `9f7e1d0` (RED), `2a893ab` (GREEN), `36e3c5e` (Task 2), `fc5631c` (Task 3)

---
*Phase: 04-multi-source-vehicle-catalog-scaled-showroom*
*Completed: 2026-06-02*
