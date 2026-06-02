---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 01
subsystem: database
tags: [typeorm, postgres, migration, pg_trgm, gin-index, unique-constraint, catalog, provenance]

# Dependency graph
requires:
  - phase: 02-editorial-dark-ds (Phase 3 rollout)
    provides: scaled editorial-dark showroom UI whose DATA LAYER this phase rebuilds
provides:
  - "vehicle_models.source provenance column (varchar(16) default 'ademe') — CAT-02"
  - "canonical UNIQUE(brand, model, fuel_type) constraint visible to both SQLite (entity @Index) and Postgres (migration) — enables ON CONFLICT upserts + cross-source dedup (CAT-03/CAT-05)"
  - "pg_trgm GIN index on lower(brand || ' ' || model) + btree(brand) — server-side search/ordering at thousands of rows (CAT-06)"
  - "dedupe-before-UNIQUE migration that cannot crash the migrationsRun:true auto-deploy (Pitfall 5)"
affects: [04-02 adapters, 04-03 search API, 04-04 merge, 05 mobile catalog browse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canonical-key UNIQUE on (brand, model, fuel_type) — year excluded from the key (metadata only)"
    - "Provenance as plain varchar, NOT a PG enum — a 3rd source drops in without ALTER TYPE (CAT-05)"
    - "Migration deduplicates (DELETE keep MIN(id) per group) BEFORE creating the UNIQUE index so migrationsRun:true cannot crash the deploy"
    - "Entity @Index mirrors the migration index so SQLite synchronize gives e2e the same ON CONFLICT support"
    - "pg_trgm GIN index expression matches the planned ILIKE search expression exactly"

key-files:
  created:
    - "backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts"
  modified:
    - "backend/src/vehicles/entities/vehicle-model.entity.ts"

key-decisions:
  - "source is plain varchar(16) (default 'ademe'), not a Postgres enum, for CAT-05 extensibility"
  - "Canonical key excludes year (matches existing ADEME sync; cross-source merge collapses years)"
  - "Dedupe DELETE runs before CREATE UNIQUE INDEX in up() (Pitfall 5) so the auto-run deploy is crash-proof"
  - "down() leaves pg_trgm installed (shared extension; safer than dropping)"
  - "Did NOT migrate VehicleSyncService.doSync to ON CONFLICT — that refactor is scoped to 04-02/04-04 (logged as DEF-04-01-01)"

patterns-established:
  - "Hand-written reversible migration mirroring 1748000000000 style: name field, IF [NOT] EXISTS guards, reverse-order down()"
  - "Schema constraint declared twice — entity @Index (SQLite/tests) + migration IF NOT EXISTS (Postgres/prod)"

requirements-completed: [CAT-02, CAT-03, CAT-06]

# Metrics
duration: 12min
completed: 2026-06-02
---

# Phase 4 Plan 01: Multi-Source Catalog Schema Foundation Summary

**`source` provenance column + canonical `UNIQUE(brand, model, fuel_type)` (entity @Index + crash-proof dedupe-before-UNIQUE Postgres migration) + pg_trgm GIN & btree search indexes — the scalable spine for ADEME+EPA ingestion and server-side showroom search.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-02T13:40:00Z
- **Completed:** 2026-06-02T13:50:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `VehicleModel` gains a `source` provenance column (varchar(16), default 'ademe') — CAT-02 — as a plain varchar (not a PG enum) so a 3rd source needs no `ALTER TYPE` (CAT-05).
- Canonical `UNIQUE(brand, model, fuel_type)` now exists in BOTH the SQLite e2e schema (via a class-level `@Index`) and the Postgres schema (via the migration), enabling cross-source dedup (CAT-03) and `ON CONFLICT` upserts (CAT-05).
- Hand-written reversible migration that **deduplicates before the unique index** (Pitfall 5), so the `migrationsRun:true` auto-deploy on Render cannot crash on pre-existing duplicates.
- `pg_trgm` GIN index on `lower(brand || ' ' || model)` + `btree(brand)` — index-backed `ILIKE` substring search and brand ordering at thousands of rows (CAT-06); the GIN expression matches the search expression planned for 04-03.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add source provenance column + canonical unique index to VehicleModel entity** - `1523a57` (feat)
2. **Task 2: Hand-written reversible migration — dedupe, source column, pg_trgm + canonical UNIQUE + search indexes** - `d8b9f81` (feat)

**Plan metadata:** (final docs commit — this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md + deferred-items.md)

## Files Created/Modified
- `backend/src/vehicles/entities/vehicle-model.entity.ts` - Added `source!: string` (varchar(16) default 'ademe') + class-level `@Index('UQ_vehicle_models_canonical', ['brand','model','fuelType'], { unique: true })`; imported `Index` from typeorm. consumption/battery/tank/year untouched.
- `backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts` - up(): ADD COLUMN source → DEDUPE (DELETE keep MIN(id) per canonical group) → CREATE EXTENSION pg_trgm → UNIQUE canonical index → btree(brand) → GIN trgm on `lower(brand || ' ' || model)`. down(): drops the 3 indexes + the column in reverse, leaves pg_trgm.

## Decisions Made
- **`source` as plain varchar, not a PG enum** — adding a 3rd source must not require a non-transactional `ALTER TYPE ... ADD VALUE` (CAT-05 extensibility, per RESEARCH).
- **year excluded from the canonical key** — matches the existing ADEME sync (year=null) and the cross-source merge that collapses all model-years to one canonical entry.
- **Dedupe DELETE precedes the UNIQUE index in `up()`** — guarantees the auto-run deploy (`migrationsRun:true`) cannot fail on legacy duplicates (Pitfall 5). Deletes only strict canonical-triple collisions, keeping the lowest id.
- **Constraint declared twice** — entity `@Index` for the SQLite e2e schema, migration `IF NOT EXISTS` for prod Postgres — so `ON CONFLICT (brand, model, fuel_type)` works in both.
- **`down()` keeps pg_trgm installed** — a shared extension; dropping it is riskier than leaving it.

## Deviations from Plan

None — plan executed exactly as written. No code was changed outside the two planned files; the ON CONFLICT sync refactor was deliberately NOT done here (see Issues Encountered / deferred item — it is the explicit subject of plans 04-02/04-04).

---

**Total deviations:** 0
**Impact on plan:** None. Both tasks landed as specified; the canonical constraint, provenance column, and search indexes are in place with a crash-proof migration.

## Issues Encountered

**Background ADEME sync now logs a UNIQUE collision under the new constraint (deferred to 04-02, not fixed here).**
- With `UQ_vehicle_models_canonical` live under SQLite `synchronize:true`, the background `onApplicationBootstrap` ADEME sync logs `Background ADEME sync failed` / `UNIQUE constraint failed: vehicle_models...`. The error is caught and logged (`.catch(...)`), so it does **not** fail any test — the vehicles e2e is green (24/24).
- Root cause: `VehicleSyncService.doSync` bulk-inserts via `repo.save()` with no conflict handling; the canonical index now rejects what was previously a silently-inserted duplicate (a startup race between the background sync and e2e fixtures).
- Deferred (not fixed in 04-01) because RESEARCH (lines 288-303, 326) scopes the `doSync` → batched `INSERT ... ON CONFLICT` (`orUpdate`/`orIgnore`) refactor to plans 04-02 (adapters) / 04-04 (merge), and `vehicle-sync.service.ts` is outside this plan's `files_modified`. Logged as **DEF-04-01-01** in `04-.../deferred-items.md`.
- Prod safety in the interim: the prod catalog is already populated (> `STARTUP_THRESHOLD = 500`), so the bootstrap sync skips on normal deploys; the migration dedupes existing rows before creating the index.

## User Setup Required

None — no external service configuration required. (The migration auto-runs on the next Render deploy via `migrationsRun:true`; `CREATE EXTENSION pg_trgm` is permitted on Supabase/Neon/Render, with a documented seq-scan fallback if ever not.)

## Next Phase Readiness
- **Ready for 04-02 (adapters):** the canonical `UNIQUE(brand, model, fuel_type)` is the `ON CONFLICT` target; 04-02 MUST replace `doSync`'s `repo.save()` with batched `orUpdate(['consumption','battery_capacity_kwh','tank_capacity_liters','source'], ['brand','model','fuel_type'])` (ADEME) / `.orIgnore()` (EPA) — see DEF-04-01-01.
- **Ready for 04-03 (search API):** the GIN index expression `lower(brand || ' ' || model)` is the exact expression the catalog `ILIKE` query must use to be index-backed.
- **Ready for 04-04 (merge):** the `source` column + canonical constraint back the first-writer-wins merge + provenance tagging.
- No blockers.

## Self-Check: PASSED

- FOUND: `backend/src/vehicles/entities/vehicle-model.entity.ts`
- FOUND: `backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts`
- FOUND: `.planning/phases/04-.../04-01-SUMMARY.md`, `deferred-items.md`
- FOUND commits: `1523a57` (Task 1), `d8b9f81` (Task 2)

---
*Phase: 04-multi-source-vehicle-catalog-scaled-showroom*
*Completed: 2026-06-02*
