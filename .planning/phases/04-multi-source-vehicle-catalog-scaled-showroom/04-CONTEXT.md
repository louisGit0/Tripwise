---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
type: context
source: /gsd:discuss-phase (interactive, 2026-06-02)
requirements: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06]
---

# Phase 4 Context — Multi-Source Vehicle Catalog + Scaled Showroom

## Domain

Generalize the single-source ADEME catalog into a **multi-source, idempotent ingestion** (ADEME FR +
EPA US, source set extensible) with provenance, normalization, cross-source dedup/merge into
thousands of canonical `brand|model|fuel` models — every entry carrying a REAL source-attributed
consumption (no fabricated defaults). Then make the garage **showroom scale**: server-side search +
pagination (no client load-all), brand grouping preserved, fast on web — exposing the API the
mobile phase (Phase 5) reuses.

## Existing pipeline (to generalize — read before building)

- `backend/src/vehicles/entities/vehicle-model.entity.ts` — `VehicleModel` (brand, model, year?,
  fuelType enum, consumption decimal, batteryCapacityKwh?, tankCapacityLiters?). Table `vehicle_models`.
- `backend/src/vehicles/vehicle-sync.service.ts` (~276 lines) — `OnApplicationBootstrap` idempotent
  UPSERT by (brand, model, year) from ADEME; the template for multi-source sync.
- `backend/src/scripts/import-ademe.ts` (~247 lines) — ADEME import script (~266 deduped entries).
- `backend/src/seeds/vehicle-models.seed.ts` — seed (41 models).
- `backend/src/vehicles/vehicles.controller.ts` — `GET /vehicles/catalog` (CatalogQueryDto: search,
  fuelType, page, limit) + `GET /vehicles/catalog/:id`; `vehicles.service.ts` `findCatalog`.
- `web/src/app/app/garage/add/page.tsx` — showroom; currently **loads ALL models client-side**
  (the CAT-06 problem to fix); already restyled in Phase 3 (visual layer done).

## Phase Decisions (from discuss, 2026-06-02)

- **PD4-1 — Merge precedence: ADEME wins, EPA complements.** On a model present in BOTH sources,
  keep the ADEME consumption (WLTP/EU cycle — correct for France); EPA only ADDS models ABSENT from
  ADEME. Record a `source`/provenance field on every entry. Protects the Core Value (accurate FR cost).
- **PD4-2 — EPA scope: filter to relevant models.** Exclude manifestly US-only models (large
  US-market pickups/SUVs not sold in Europe, brands absent from the FR market) so the catalog stays
  a clean set of thousands of COMMON models — not tens of thousands of US-market noise. (Researcher to
  define a concrete, defensible relevance filter — e.g. brand allow-list of marques sold in FR, and/or
  body-class/segment exclusions.)
- **PD4-3 — Ingestion: versioned CSV snapshot + idempotent script.** Commit an EPA export snapshot
  into the repo and add an idempotent sync script (mirroring the ADEME pattern) — reproducible, no
  network dependency at sync time, deterministic build. No runtime fetch from fueleconomy.gov.

## Locked / Inherited

- **Real consumption only (Core Value):** never fabricate/default consumption; every entry is
  source-attributed (CAT-01/CAT-02).
- **Idempotent + extensible (CAT-05):** re-running any sync creates no duplicates; adding a 3rd
  source later must not require reworking normalization/dedup.
- **Canonical units (CAT-02):** convert US MPG → L/100km, Wh/km → kWh/100km; canonical brand/model/
  fuel. (Researcher: exact conversion factors + canonicalization rules.)
- **Showroom already restyled (Phase 3):** Phase 4 changes its DATA LAYER (client-load-all →
  server-side search + pagination), reusing the existing editorial-dark visuals — NOT a visual
  redesign. Keep brand grouping.

## Scope Fence

**In:** multi-source ingestion (ADEME + EPA) with provenance; EPA CSV snapshot + idempotent sync
script + relevance filter; normalization (unit conversion, canonical key); cross-source dedup/merge
(ADEME-precedence); schema changes needed for provenance/scale (entity + migration); server-side
catalog search + pagination API (extend `GET /vehicles/catalog`); rework `garage/add` to use
server-side search (debounced query → API, paginated, brand-grouped) instead of client load-all.

**Out:** mobile showroom (Phase 5 consumes this API); a 3rd data source (architecture must allow it,
but only ADEME+EPA implemented now); visual redesign of the showroom (Phase 3 done — data layer
only); changing the cost calculation; tolls; auth.

## Success Criteria (from ROADMAP / CAT-01..06)

1. Adding a vehicle, the user finds far more common models than the ~266 ADEME baseline (thousands,
   multi-source) — every entry has real, source-attributed consumption, no fabricated values.
2. Same `brand|model|fuel` from different sources appears exactly once (deduped/merged), consumption
   normalized to canonical units.
3. The showroom loads/searches via server-side search + pagination (no client load-all), fast and
   brand-grouped at scale, via an API mobile can reuse.
4. Re-running the catalog sync is idempotent (no duplicates), and a new source can be added without
   reworking normalization/dedup.

## Open Questions For Research

- EPA dataset: the bulk file (fueleconomy.gov `vehicles.csv`) — columns, size, license, the fields
  needed (make/model/year/fuelType/combined MPG or kWh/100mi), and the exact MPG→L/100km +
  EPA-kWh/100mi→kWh/100km conversion factors.
- A concrete, defensible EPA **relevance filter** (brand allow-list of marques sold in FR + segment/
  body-class exclusions) to realize PD4-2 without hand-curation drift.
- Canonical key + normalization rules (brand/model casing, trim handling, fuelType mapping EPA→
  `FuelType` enum, dedup granularity — include year?).
- Schema for provenance + scale: add `source` (+ maybe `source_id`, `market`) to `vehicle_models`;
  indexes for server-side search at thousands-of-rows scale (trigram/ILIKE? brand index?).
- Server-side search/pagination API shape (query, fuelType, brand grouping, page/limit, total) +
  the debounced showroom client rework — and the contract Phase 5 mobile will reuse.
- A scalable, idempotent multi-source sync architecture (a source-adapter interface so a 3rd source
  drops in — CAT-05 extensibility).
