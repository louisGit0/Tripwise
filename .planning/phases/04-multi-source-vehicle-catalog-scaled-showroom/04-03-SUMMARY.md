---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 03
subsystem: backend
tags: [nestjs, typeorm, querybuilder, catalog, server-side-search, pagination, facet, dto-validation, pg_trgm]

# Dependency graph
requires:
  - phase: 04-01 (schema foundation)
    provides: "pg_trgm GIN index on lower(brand || ' ' || model) + btree(brand) + canonical UNIQUE — the index this search query aligns to"
provides:
  - "GET /vehicles/catalog: server-side search + fuelType + fuelCategory + brand + bounded pagination, frozen { items, total, page, limit, totalPages } shape — the contract Phase 5 mobile reuses (CAT-06)"
  - "GET /vehicles/catalog/brands: [{ brand, count }] ordered by brand ASC, honouring the same filters — brand directory without client load-all"
  - "categoryToFuelTypes(category): FuelType[] shared helper (reverse of toCategory) in common/fuel-type-categories.ts"
affects: [04-05 showroom rework, 05 mobile catalog browse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Catalog search uses LOWER(vm.brand || ' ' || vm.model) LIKE :s — matches the migration's pg_trgm GIN expression (index-eligible in Postgres) AND runs under SQLite (NOT ILIKE)"
    - "Shared applyCatalogFilters(qb, query) WHERE-builder reused by the listing + the brands facet — DRY, single source of filter truth"
    - "fuelType (single) takes precedence over fuelCategory (expanded set) when both are sent"
    - "All user input bound as QueryBuilder :params (:s, :brand, :...fts) — no SQL string interpolation (T-04-03-01)"
    - "limit bounded @Max(100); skip/take enforce a bounded page (T-04-03-02)"
    - "fuelCategory validated @IsIn(['gas','diesel','ev','gpl']) → 400 before the query (T-04-03-03)"
    - "Type-only FuelCategory imported with `import type` in the DTO (isolatedModules + emitDecoratorMetadata)"

key-files:
  created: []
  modified:
    - "backend/src/vehicles/dto/catalog-query.dto.ts"
    - "backend/src/common/fuel-type-categories.ts"
    - "backend/src/vehicles/vehicles.service.ts"
    - "backend/src/vehicles/vehicles.controller.ts"
    - "backend/test/vehicles.e2e-spec.ts"

key-decisions:
  - "Search expression LOWER(brand || ' ' || model) LIKE :s deliberately matches the 04-01 GIN index expression exactly (index-backed in PG, seq-scan-safe in SQLite e2e); NOT ILIKE — keeps the e2e harness working"
  - "Extracted applyCatalogFilters() so findCatalog + findCatalogBrands share one filter implementation (no drift between listing and facet counts)"
  - "fuelType precedence over fuelCategory when both supplied (single-value filter wins)"
  - "categoryToFuelTypes lives in common/fuel-type-categories.ts (reverse of toCategory) — NOT a new file; trips.service.ts untouched"
  - "GET catalog/brands declared BEFORE catalog/:id so Nest does not match 'brands' as a UUID id"
  - "Aligned the vehicles e2e ValidationPipe to the production pipe (enableImplicitConversion) so int query params coerce — required for the pagination test (Rule 3)"

requirements-completed: [CAT-06]

# Metrics
duration: 10min
completed: 2026-06-02
---

# Phase 4 Plan 03: Server-Side Catalog Search + Brand Facet Summary

**`GET /vehicles/catalog` now searches (index-aligned `LOWER(brand || ' ' || model) LIKE`), filters by brand + fuelType + fuelCategory, and paginates server-side with the frozen `{ items, total, page, limit, totalPages }` shape; a new `GET /vehicles/catalog/brands` facet returns `[{ brand, count }]` so the showroom renders the brand directory without ever loading all rows — the CAT-06 contract Phase 5 mobile reuses, parameterized and bounded.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `CatalogQueryDto` gains `brand` (`@IsString`) and `fuelCategory` (`@IsIn(['gas','diesel','ev','gpl'])`) alongside the existing `search`/`fuelType`/`page`/`limit`; `@Max(100)` on `limit` retained (DoS bound, T-04-03-02).
- `categoryToFuelTypes(category): FuelType[]` added to `common/fuel-type-categories.ts` as the reverse of `toCategory` (gas → SP95/SP95_E10/SP98/E85, diesel → DIESEL, ev → ELECTRIC, gpl → GPL). `trips.service.ts` untouched.
- `findCatalog` rewritten to search `LOWER(vm.brand || ' ' || vm.model) LIKE :s` — the exact expression the 04-01 `pg_trgm` GIN index covers (index-backed in Postgres, seq-scan-safe under the SQLite e2e harness). Adds `brand` exact filter and `fuelCategory` expansion (`vm.fuelType IN (:...fts)`), with `fuelType` taking precedence when both are sent. The `{ items, total, page, limit, totalPages }` shape is unchanged.
- `findCatalogBrands` returns `[{ brand, count: Number(count) }]` grouped/ordered by brand ASC, honouring the same filters via a shared `applyCatalogFilters()` builder (no count/listing drift).
- Controller adds `GET catalog/brands` declared **before** `catalog/:id` so Nest does not match `'brands'` as a UUID id.
- e2e extended (+7 cases): `search=clio` shape, `fuelCategory=ev` (ELECTRIC only), `brand=Tesla` (Tesla only), `page=1&limit=1` (1 item + coherent `totalPages`), `400` on `fuelCategory=banana`, and the `/brands` facet shape (ordered, numeric counts, Tesla=2) + its `fuelCategory` filter.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend DTO + categoryToFuelTypes + findCatalog/findCatalogBrands + /brands route** — `d184eaf` (feat)
2. **Task 2: Extend vehicles e2e — search/brand/fuelCategory/pagination + /brands facet** — `d5379b9` (test)

## Files Created/Modified
- `backend/src/vehicles/dto/catalog-query.dto.ts` — added `brand` + `fuelCategory` (`import type FuelCategory`); kept `search`/`fuelType`/`page`/`limit` + `@Max(100)`.
- `backend/src/common/fuel-type-categories.ts` — added `categoryToFuelTypes` (reverse mapping).
- `backend/src/vehicles/vehicles.service.ts` — `findCatalog` index-aligned search + brand/fuelCategory filters; new `findCatalogBrands` facet + `BrandCount` interface; shared private `applyCatalogFilters` builder.
- `backend/src/vehicles/vehicles.controller.ts` — `GET catalog/brands` route before `catalog/:id`.
- `backend/test/vehicles.e2e-spec.ts` — +2 seed rows, +7 assertions, ValidationPipe aligned to production (enableImplicitConversion).

## Decisions Made
- **Search matches the GIN index expression exactly** — `LOWER(brand || ' ' || model) LIKE` (not ILIKE) is the only form that is both index-eligible in Postgres and valid under the SQLite e2e harness; it equals the 04-01 migration index `lower(brand || ' ' || model)`.
- **`applyCatalogFilters` extracted** — the listing and the brands facet must filter identically; one builder guarantees the counts match the filtered listing.
- **`fuelType` precedence over `fuelCategory`** — the single-value filter wins if a client sends both.
- **`catalog/brands` before `catalog/:id`** — Nest route order; otherwise `'brands'` is captured by the `:id` param (and rejected by `ParseUUIDPipe`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] e2e ValidationPipe diverged from production (no `enableImplicitConversion`)**
- **Found during:** Task 2 (the `page=1&limit=1` test returned 400)
- **Issue:** The vehicles e2e harness built `ValidationPipe` without `transformOptions: { enableImplicitConversion: true }`, so query-string ints failed `@IsInt()` and the required pagination test 400'd. Production (`main.ts`) and the trips e2e already use implicit conversion (CLAUDE.md: project-wide).
- **Fix:** Added `transformOptions: { enableImplicitConversion: true }` to the e2e pipe so it mirrors production. Makes the harness more faithful (not less); negative tests (`fuelType=HYDROGEN`, `fuelCategory=banana`) still 400 via `@IsEnum`/`@IsIn`.
- **Files modified:** `backend/test/vehicles.e2e-spec.ts`
- **Commit:** `d5379b9`

**2. [Rule 3 - Blocking] `FuelCategory` decorated-signature import**
- **Found during:** Task 1 (`tsc` TS1272)
- **Issue:** `FuelCategory` (a type alias) used in a decorated DTO property requires `import type` under `isolatedModules` + `emitDecoratorMetadata`.
- **Fix:** Changed to `import type { FuelCategory }`.
- **Files modified:** `backend/src/vehicles/dto/catalog-query.dto.ts`
- **Commit:** `d184eaf`

**Total deviations:** 2 (both Rule 3 blocking fixes; no architectural change).

## Known Stubs

None.

## Threat Flags

None — no new security surface beyond the threat register. The endpoints remain public (catalog is non-sensitive reference data, T-04-03-04 accept); all user input is bound as parameters (T-04-03-01 mitigate), pagination is bounded (T-04-03-02 mitigate), and invalid `fuelCategory` is rejected by the DTO before the query (T-04-03-03 mitigate).

## Issues Encountered

**Background ADEME sync still logs a caught UNIQUE collision (DEF-04-01-01, not this plan).**
- The vehicles e2e log shows `Background ADEME sync failed / UNIQUE constraint failed` from `VehicleSyncService.doSync` (still `repo.save()`, no `ON CONFLICT`). It is caught/logged and does not fail any test (31/31 vehicles, 150/150 full suite green). The `doSync` → batched `INSERT … ON CONFLICT` refactor remains scoped to plan 04-04 (DEF-04-01-01).

## Verification
- `cd backend && npx tsc --noEmit && npm run build` — clean
- `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="vehicles" --forceExit` — 31/31 green
- `cd backend && npx jest --config test/jest-e2e.json --forceExit` — 150/150 green (was 143, +7 new)

## Next Phase Readiness
- **Ready for 04-05 (showroom rework):** the `{ items, total, page, limit, totalPages }` listing + `/catalog/brands` facet + `fuelCategory` param are the data layer the client-load-all showroom switches to.
- **Ready for Phase 5 (mobile):** the response contract is frozen and proven by e2e.
- No blockers.

## Self-Check: PASSED

- FOUND: `backend/src/vehicles/dto/catalog-query.dto.ts`
- FOUND: `backend/src/common/fuel-type-categories.ts`
- FOUND: `backend/src/vehicles/vehicles.service.ts`
- FOUND: `backend/src/vehicles/vehicles.controller.ts`
- FOUND: `backend/test/vehicles.e2e-spec.ts`
- FOUND: `.planning/phases/04-multi-source-vehicle-catalog-scaled-showroom/04-03-SUMMARY.md`
- FOUND commits: `d184eaf` (Task 1), `d5379b9` (Task 2)

---
*Phase: 04-multi-source-vehicle-catalog-scaled-showroom*
*Completed: 2026-06-02*
