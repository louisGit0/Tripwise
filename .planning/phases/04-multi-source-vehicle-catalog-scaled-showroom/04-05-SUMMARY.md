---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 05
subsystem: web
tags: [nextjs, react, server-side-search, debounce, pagination, showroom, catalog, editorial-dark, data-layer]

# Dependency graph
requires:
  - phase: 04-03 (server-side catalog search API)
    provides: "GET /vehicles/catalog { items,total,page,limit,totalPages } + fuelCategory/fuelType/search/page/limit params — the frozen contract this showroom consumes"
provides:
  - "Server-driven garage showroom: debounced (300ms) GET /vehicles/catalog with brand-grouped accumulation + explicit 'Charger plus' pagination — no client load-all (CAT-06, web slice)"
  - "Optional source provenance field on the web VehicleModel type"
affects: [04-06 phase verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounced server-side catalog search: useDebounce(search, 300) → apiClient.get('/vehicles/catalog', { params }) (reuses the existing hook, mirrors AutocompleteInput)"
    - "Two-effect pagination: a reset effect on [debounced, fuelFilter] sets page→1; a loader effect on [debounced, fuelFilter, page] fetches — page 1 REPLACES, page>1 APPENDS"
    - "Cancellable loader effect: the cleanup sets cancelled=true so a lingering page>1 fetch is discarded when the query resets to page 1 (no wrong append)"
    - "Chip → single server param map (no client multi-type filter): ev/diesel/gpl → fuelCategory, essence → fuelCategory=gas, e85 → fuelType=E85, all → none"
    - "Brand grouping useMemo now derives from the accumulated items (not a client-filtered slice); header reports loaded count + 'sur {total}' from the API total"

key-files:
  created: []
  modified:
    - "web/src/types/api.ts"
    - "web/src/app/app/garage/add/page.tsx"

key-decisions:
  - "Removed the load-all (parallel MAX_PAGES page fetch up to 3000 rows) + the client substring useMemo filter entirely; the server now searches/filters/paginates (T-04-05-03 mitigated)"
  - "Used a cancellable two-effect approach (reset page→1 on query change + loader on [debounced,fuelFilter,page]) so a filter change while on page>1 cannot wrongly append — the effect cleanup cancels the in-flight higher-page fetch"
  - "essence chip maps to fuelCategory=gas in ONE request (per plan), which the 04-03 categoryToFuelTypes expands to SP95/SP95_E10/SP98/E85; the dedicated e85 chip narrows to exactly fuelType=E85"
  - "PAGE_SIZE=60 (bounded; under the API @Max(100)); 'Charger plus' increments page and shows isLoadingMore, disappears at the last page — mirrors the trips/history pattern"
  - "Dropped the now-unused FuelType import + FUEL_FILTERS.types field (client filtering gone); kept every Phase 3 visual (toolbar, chips, BrandAvatar, FuelBadge, brand sections, ModelCard, Modal, FOCUS_RING, Skeleton) verbatim — data-layer-only (MD-2)"

requirements-completed: [CAT-06]

# Metrics
duration: 6min
completed: 2026-06-02
---

# Phase 4 Plan 05: Server-Side Showroom Search + Pagination Summary

**The garage showroom (`/app/garage/add`) no longer loads the entire catalog into the browser — it issues a debounced (300ms) server-side `GET /vehicles/catalog` request, brand-groups the accumulated results, and pages with an explicit "Charger plus" control, so it stays fast at thousands of models while every Phase 3 editorial-dark visual (and the add-vehicle submit flow) is preserved exactly.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 2 (1 atomic code commit; Task 2's substance landed within Task 1's holistic file rewrite, gated by the production build)
- **Files modified:** 2

## Accomplishments
- `web/src/types/api.ts` — `VehicleModel` gains an optional `source?: 'ademe' | 'epa' | string` (provenance the UI may show; consumed contract from 04-02/04-03).
- `web/src/app/app/garage/add/page.tsx` — data layer fully reworked from client load-all to server-side search:
  - **Removed**: the load-all `useEffect` (parallel `MAX_PAGES` page fetch, up to 3000 rows), the `MAX_PAGES` constant, and the client substring `useMemo` filter.
  - **Added**: `const debounced = useDebounce(search, 300)`; `items`/`page`/`totalPages`/`total`/`isLoading`/`isLoadingMore` state; a reset effect (`[debounced, fuelFilter] → setPage(1)`); a cancellable loader effect (`[debounced, fuelFilter, page]`) that calls `apiClient.get<CatalogPage>('/vehicles/catalog', { params: { search: debounced || undefined, page, limit: 60, ...fuelParams(fuelFilter) } })`, **replacing** on page 1 and **appending** on page>1.
  - **Chip → server param** (`fuelParams`): `all`→none, `ev`→`fuelCategory:'ev'`, `essence`→`fuelCategory:'gas'`, `diesel`→`fuelCategory:'diesel'`, `gpl`→`fuelCategory:'gpl'`, `e85`→`fuelType:'E85'` — one request per change, never the old multi-type client filter.
  - **Brand grouping** `useMemo` now folds over the accumulated `items`; the header reads the loaded model count + `sur {total}` (from the API `total`) + brand count from `grouped`.
  - **"Charger plus"** `CTAButton` shown when `page < totalPages`, increments `page`, shows `loading={isLoadingMore}`, double-fire-guarded, and disappears at the last page — mirrors `trips/page.tsx`.
  - **Skeleton** shows on the page-1 fetch only; the empty state keys off the accumulated `items`.
- Every Phase 3 visual (sticky toolbar, search Input + clear, fuel chips, brand directory jump-list, brand sections, `ModelCard`, config `Modal` + `handleAdd` POST `/vehicles/me`, `FOCUS_RING`, `Skeleton`) is unchanged.

## Task Commits

1. **Task 1 (data layer: type + debounced server-side search + pagination)** — `43ddd23` (feat) — `web/src/types/api.ts`, `web/src/app/app/garage/add/page.tsx`
2. **Task 2 (brand grouping over accumulated items + counts/header + build verification)** — no separate code diff; its deliverables (grouping over `items`, honest loaded/total header, page-1 skeleton, "Charger plus" loading state) were implemented within the Task 1 holistic file rewrite and verified by the green production build (`tsc --noEmit` + `npm run build`, 18/18 routes; `/app/garage/add` 6.78 kB).

## Files Created/Modified
- `web/src/types/api.ts` — added optional `source` to `VehicleModel`.
- `web/src/app/app/garage/add/page.tsx` — removed load-all + `MAX_PAGES` + client filter; added `useDebounce`, server-side loader + two-effect pagination, chip→param map, accumulated-items grouping, "Charger plus"; dropped the now-unused `FuelType` import + `FUEL_FILTERS.types` field.

## Decisions Made
- **Two-effect, cancellable pagination** — a reset effect sets `page→1` on query change; the loader effect's cleanup (`cancelled=true`) discards any in-flight page>1 fetch when the query resets, so a filter change while paged-in never wrongly appends. Robust against the classic lingering-page bug while still keying the loader on `[debounced, fuelFilter, page]` as the plan specified.
- **`essence` → one `fuelCategory=gas` request** (per plan) — the 04-03 backend expands gas to SP95/SP95_E10/SP98/E85; the separate `e85` chip narrows via `fuelType=E85`.
- **`PAGE_SIZE=60`** — bounded under the API `@Max(100)`; explicit "Charger plus" pagination replaces the unbounded client memory of load-all (T-04-05-03).
- **Data-layer-only** — no new visual sections; all Phase 3 atoms/sections preserved verbatim (MD-2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `FuelType` import + `FUEL_FILTERS.types` became unused after removing the client filter**
- **Found during:** Task 1
- **Issue:** Removing the client substring/type `useMemo` filter left `FUEL_FILTERS.types: FuelType[] | null` and the `FuelType` import with no consumer; Next.js build treats `@typescript-eslint/no-unused-vars` as an error.
- **Fix:** Reduced `FUEL_FILTERS` to `{ key, label }[]` and dropped `FuelType` from the import; chip→param mapping moved to the `fuelParams(key)` helper.
- **Files modified:** `web/src/app/app/garage/add/page.tsx`
- **Commit:** `43ddd23`

**Total deviations:** 1 (Rule 3 blocking; no architectural change).

## Known Stubs

None. The showroom is wired to the live `/vehicles/catalog` API; no placeholder/empty-data paths remain.

## Threat Flags

None — no new security surface beyond the plan's threat register. The client only passes `search`/`brand`/`fuelCategory`/`fuelType`/`page` as axios `params` (URL-encoded; server-side parameterized in 04-03, T-04-05-01); catalog text renders as auto-escaped React (no `dangerouslySetInnerHTML`, T-04-05-02); load-all is removed and replaced by a bounded `limit=60` + explicit pagination (T-04-05-03 mitigated).

## Verification
- `cd web && npx tsc --noEmit` — clean
- `cd web && npm run build` — green, 18/18 routes; `/app/garage/add` 6.78 kB
- Network shape: a single debounced request per search/filter change (not N parallel pages); "Charger plus" appends the next page
- Phase 3 visuals + add-vehicle submit flow unchanged (data-layer-only, MD-2)

## Next Phase Readiness
- **Ready for 04-06 (phase verification checkpoint):** the web showroom now searches/paginates server-side at scale; combined with the multi-source ingestion (04-02/04-04) + search API (04-03), the catalog can grow to thousands with a fast, brand-grouped, no-load-all showroom.
- The consumed `{ items, total, page, limit, totalPages }` contract is the same one Phase 5 mobile reuses.
- No blockers.

## Self-Check: PASSED

- FOUND: `web/src/types/api.ts`
- FOUND: `web/src/app/app/garage/add/page.tsx`
- FOUND: `.planning/phases/04-multi-source-vehicle-catalog-scaled-showroom/04-05-SUMMARY.md`
- FOUND commit: `43ddd23` (Task 1)

---
*Phase: 04-multi-source-vehicle-catalog-scaled-showroom*
*Completed: 2026-06-02*
