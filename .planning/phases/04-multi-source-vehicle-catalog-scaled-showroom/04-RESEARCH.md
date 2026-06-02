# Phase 4: Multi-Source Vehicle Catalog + Scaled Showroom — Research

**Researched:** 2026-06-02
**Domain:** ETL / data ingestion (CSV) · cross-source dedup/merge · Postgres scale + full-text-ish search · server-side paginated API · React showroom rework
**Confidence:** HIGH (EPA dataset facts + conversion factors verified against official docs; codebase patterns read directly)

## Summary

Phase 4 generalizes the working single-source ADEME pipeline (`vehicle-sync.service.ts` + `import-ademe.ts`, ~266 deduped entries) into a **multi-source, idempotent, provenance-tracked** ingestion that merges ADEME (France, WLTP) with a filtered slice of the EPA `fueleconomy.gov` bulk dataset (US), producing **thousands** of canonical `brand|model|fuel` models — each carrying a real, source-attributed consumption (Core Value: never fabricated). Then it converts the `garage/add` showroom from a **client load-all** (currently fetches every page up to 3000 rows into the browser) to **server-side search + pagination**, exposing the contract Phase 5 (mobile) reuses.

The unknowns are all answerable now: the EPA file is a public-domain CSV at a stable URL with documented columns; the two unit conversions are exact arithmetic; the EPA→`FuelType` mapping is a finite table (with one genuine ambiguity — PHEVs); the relevance filter is best realized as a **brand allow-list of marques sold in France** (EPA's value is the international makes, since FR-only brands like Renault/Peugeot/Citroën aren't in the US dataset at all); the merge is **ADEME-precedence first-writer-wins on a normalized canonical key**, enforced by a Postgres `UNIQUE(brand, model, fuel_type)` index enabling clean `ON CONFLICT` upserts; and search at single-digit-thousands of rows is comfortably handled by a `pg_trgm` GIN index (with a plain `ILIKE` seq-scan being an acceptable fallback at this scale).

**Primary recommendation:** Build a `CatalogSourceAdapter` interface (`load()` + `normalize()` + `precedence`), implement `AdemeAdapter` and `EpaAdapter` behind it, run them precedence-ordered into an in-memory merge Map keyed by an uppercased canonical key, and `ON CONFLICT (brand, model, fuel_type)` upsert (ADEME `DO UPDATE`, EPA `DO NOTHING`). Add `source` (plain varchar, not a PG enum) to `vehicle_models`, a `UNIQUE` index on the canonical triple, and a `pg_trgm` GIN index for search. Extend `GET /vehicles/catalog` to return `{ items, total, page, limit, totalPages }` (already the shape) and add brand grouping; rewrite the showroom to debounce → query the API → render paginated, brand-grouped results.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **PD4-1 — Merge precedence: ADEME wins, EPA complements.** On a model present in BOTH sources, keep the ADEME consumption (WLTP/EU cycle — correct for France); EPA only ADDS models ABSENT from ADEME. Record a `source`/provenance field on every entry. Protects the Core Value (accurate FR cost).
- **PD4-2 — EPA scope: filter to relevant models.** Exclude manifestly US-only models (large US-market pickups/SUVs not sold in Europe, brands absent from the FR market) so the catalog stays a clean set of thousands of COMMON models — not tens of thousands of US-market noise.
- **PD4-3 — Ingestion: versioned CSV snapshot + idempotent script.** Commit an EPA export snapshot into the repo and add an idempotent sync script (mirroring the ADEME pattern) — reproducible, no network dependency at sync time, deterministic build. No runtime fetch from fueleconomy.gov.

### Locked / Inherited
- **Real consumption only (Core Value):** never fabricate/default consumption; every entry is source-attributed (CAT-01/CAT-02).
- **Idempotent + extensible (CAT-05):** re-running any sync creates no duplicates; adding a 3rd source later must not require reworking normalization/dedup.
- **Canonical units (CAT-02):** convert US MPG → L/100km, Wh/km → kWh/100km; canonical brand/model/fuel.
- **Showroom already restyled (Phase 3):** Phase 4 changes its DATA LAYER (client-load-all → server-side search + pagination), reusing the existing editorial-dark visuals — NOT a visual redesign. Keep brand grouping.

### Claude's Discretion (Researcher-defined, per CONTEXT open questions)
- Exact EPA columns + conversion factors (defined below, verified).
- The concrete relevance filter + brand allow-list seed.
- Canonical-key normalization rules + dedup granularity (year in key? — answer: NO).
- Schema for provenance + scale; indexes.
- Search/pagination API shape + showroom rework approach.
- Source-adapter interface for CAT-05 extensibility.

### Deferred Ideas (OUT OF SCOPE)
- Mobile showroom (Phase 5 consumes this API).
- A 3rd data source (architecture must allow it; only ADEME+EPA implemented now).
- Visual redesign of the showroom (Phase 3 done — data layer only).
- Changing the cost calculation; tolls; auth.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Ingest from multiple real-consumption sources (ADEME + EPA, extensible) — never fabricated | EPA dataset facts (file/URL/columns) + `CatalogSourceAdapter` interface (§Architecture Patterns) |
| CAT-02 | Normalize to canonical brand/model/fuel/consumption with unit conversion + provenance field | Exact conversion formulas (§Code Examples) + EPA→FuelType map + canonical-key rules + `source` column (§Schema) |
| CAT-03 | Dedup + merge across sources into canonical `brand\|model\|fuel` (no cross-source dupes) | ADEME-precedence merge algorithm + `UNIQUE(brand,model,fuel_type)` index + `ON CONFLICT` (§Architecture Patterns, §Schema) |
| CAT-04 | Coverage substantially expanded vs ~266 ADEME baseline → thousands | EPA ~48k raw rows → relevance filter + dedup → thousands of FR-relevant models (§Relevance Filter, §Pitfalls) |
| CAT-05 | Idempotent + re-runnable; new source drops in without reworking normalize/dedup | First-writer-wins Map + `ON CONFLICT` idempotency + adapter interface (§Architecture Patterns) |
| CAT-06 | Showroom scales: server-side search + pagination (no client load-all), brand grouping, fast web+mobile | Extended `GET /vehicles/catalog` shape + `pg_trgm` index + debounced showroom rework (§Server-side Search, §Schema) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack fixed:** NestJS 11 + TypeORM + Postgres 16; reuse existing module patterns. No new conflicting frameworks.
- **Backend uses Node native `fetch`** (no axios server-side). CSV parsing already uses `fs` + `readline` (see `import-ademe.ts`) — no new parser dependency required.
- **No `console.log` in production runtime code** — CLI scripts (`src/scripts/`, `src/seeds/`) are the documented exception (they already use `console.log`).
- **TypeORM migrations:** `synchronize:false` in prod, `migrationsRun:true` (auto-run on Render deploy from `dist/database/migrations/*.js`). Migrations are **hand-written**, reversible (`up`/`down`), use `IF NOT EXISTS` / `IF EXISTS` guards. File naming: `<epoch-ms>-PascalCaseName.ts`, class `NamePascalCase<epochms>`.
- **Naming:** services/controllers `kebab-case.role.ts`; DTOs `kebab-action-resource.dto.ts`; `FuelType` enum members `SCREAMING_SNAKE_CASE`; module constants `SCREAMING_SNAKE_CASE`; React components `PascalCase.tsx`.
- **DTO validation:** global `ValidationPipe` `{ whitelist, forbidNonWhitelisted, transform, enableImplicitConversion }`; optional fields `@IsOptional()` first.
- **No fabricated consumption** — every catalog row's `consumption` must trace to a source value (enforced: skip rows where the source metric is missing/≤0, exactly as the ADEME sync already does).
- **`master` auto-deploys (Render + Vercel)** — commit + push after each verified update.
- **Decimal columns** use `decimalTransformer` (Postgres returns DECIMAL as string).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| EPA CSV snapshot storage | Repository (committed file) | — | PD4-3: deterministic build, no runtime fetch. Lives under `backend/src/data/` or `backend/data/`. |
| Source ingestion (load + normalize + convert) | API / Backend (NestJS service + CLI script) | — | Business logic (unit conversion, fuel mapping, dedup) belongs server-side; never in the client. |
| Cross-source merge + dedup | API / Backend (in-memory Map) | Database (UNIQUE index enforcement) | Merge logic in code; the DB UNIQUE constraint is the safety net + enables idempotent `ON CONFLICT`. |
| Provenance + scale schema | Database (migration) | — | New `source` column + indexes; hand-written reversible migration. |
| Catalog search + pagination | API / Backend (`GET /vehicles/catalog`) | Database (pg_trgm/btree index) | Search must run in SQL with `LIMIT/OFFSET`; the browser must NOT load all rows (CAT-06). |
| Brand grouping | API / Backend (group within the page) OR client (group the returned page) | — | Group the *current page's* items — grouping is a presentation concern over a bounded result set. |
| Showroom UI (debounce, render, paginate) | Browser / Client (Next.js client component) | Frontend Server (route only) | `garage/add` is already a client component; only its data layer changes. |

## Standard Stack

### Core (all already in the project — no new runtime dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/typeorm` + `typeorm` | 11.0.1 / 1.0.0 (installed) | Repository, QueryBuilder, migrations, `ON CONFLICT` via `.orIgnore()`/`.orUpdate()` | Already the data layer; reuse `VehicleModel` repo + migration pattern |
| Node `fs` + `readline` | Node 20 builtin | Stream-parse the committed EPA CSV line by line | Already used in `import-ademe.ts`; no parser dep, handles large files without loading into memory |
| `pg_trgm` (Postgres extension) | Postgres 16 builtin contrib | Trigram GIN index for fast `ILIKE '%term%'` substring search | Standard Postgres answer for fuzzy/substring catalog search; supported on Supabase/Neon/Render |
| `class-validator` / `class-transformer` | installed | Extend `CatalogQueryDto` (add `brand`, keep `search`/`fuelType`/`page`/`limit`) | Existing DTO validation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useDebounce` hook | exists at `web/src/hooks/useDebounce.ts` | Debounce the showroom search input (300ms) before hitting the API | Reuse verbatim — already used by `AutocompleteInput` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node `readline` line-split CSV | `csv-parse` / `papaparse` npm | EPA CSV has quoted fields containing commas (model names, descriptions) → a naive `split(',')` WILL break. **This is the one real reason to add a parser.** See Pitfalls. Recommendation: add `csv-parse` (battle-tested, ~0 deps) **only if** the EPA file proves to have embedded commas/quotes in needed columns; otherwise a quote-aware manual splitter. Verify against the real file. |
| pg_trgm GIN | plain btree(brand) + `ILIKE` seq-scan | At ~thousands of rows a seq-scan `ILIKE` is <5ms — perfectly acceptable. pg_trgm is the forward-looking choice and makes leading-wildcard search index-backed. Recommend pg_trgm but treat it as low-risk-either-way. |
| `source` as Postgres native enum | `source` as plain `VARCHAR(16)` | A native PG enum requires `ALTER TYPE ... ADD VALUE` (non-transactional, awkward) to add a 3rd source → **violates CAT-05 extensibility**. Use plain varchar. |

**Installation:** No mandatory installs. *Conditional* (only if EPA CSV has embedded commas/quotes in the columns we read):
```bash
npm install csv-parse --workspace backend   # verify on npm registry first; see Package Legitimacy
```

## Package Legitimacy Audit

> Phase 4 installs **no external packages by default** — all ingestion reuses Node builtins + existing deps. The only *conditional* candidate is `csv-parse`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `csv-parse` | npm | ~13 yrs (est.) | ~3M+/wk (est.) | github.com/adaltas/node-csv | not run (offline) | **CONDITIONAL** — `[ASSUMED]`; planner must gate behind `checkpoint:human-verify` (`npm view csv-parse version` + maintainer check) before install, AND only install if the real EPA file requires it |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was not run in this session. Per protocol, the one conditional package is tagged `[ASSUMED]`; the planner must add a `checkpoint:human-verify` task before any install. Prefer the zero-dependency quote-aware line splitter if feasible.*

## EPA Dataset Facts (PD4-3) — verified

| Fact | Value | Provenance |
|------|-------|------------|
| File (unzipped) | `https://www.fueleconomy.gov/feg/epadata/vehicles.csv` | [CITED: fueleconomy.gov/feg/ws/index.shtml] |
| File (zipped) | `https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip` | [CITED: fueleconomy.gov/feg/ws/index.shtml] |
| Coverage | model years **1984 → current** (one row per trim/engine/config) | [CITED: fueleconomy.gov field docs] |
| Approx row count | **~48,000 rows** (tens of thousands; grows yearly) | [ASSUMED] — exact count not verified live; treat as "tens of thousands, filtered+deduped down to thousands" |
| Format | CSV, header row, comma-delimited, **some fields quoted** (model/description can contain commas) | [ASSUMED] — confirm quoting on the real file before choosing the parser |
| License | U.S. federal government work → **public domain** (17 U.S.C. §105); administered by Oak Ridge National Lab for DOE/EPA; also catalogued on data.gov as a U.S. Government Work | [CITED: fueleconomy.gov footer] + [ASSUMED: §105 public-domain basis] |
| Runtime use | **None** — commit a snapshot to the repo (PD4-3). Download once during dev, trim columns, commit. | PD4-3 |

### Columns needed (exact EPA field names) — verified
| EPA field | Meaning | Unit | Use |
|-----------|---------|------|-----|
| `make` | Manufacturer / division | text | → canonical `brand` |
| `model` | Model name (carline) | text | → canonical `model` (strip trim noise) |
| `year` | Model year | int | metadata only — **NOT part of canonical key** (see dedup) |
| `fuelType1` | Primary fuel type | text label | → `FuelType` mapping (primary) |
| `fuelType2` | Secondary fuel (dual-fuel/FFV/PHEV) | text label | flag dual-fuel; PHEV handling |
| `atvType` | Alt-fuel / advanced tech ("EV", "Hybrid", "Plug-in Hybrid", "Diesel", "FFV", "CNG"…) | text label | disambiguate EV vs PHEV vs hybrid |
| `comb08` | **Combined MPG** for `fuelType1` (MPGe for electric/CNG) | mi/gal (or MPGe) | ICE/diesel consumption source |
| `comb08U` | Unrounded combined MPG for `fuelType1` | mi/gal | higher-precision alternative to `comb08` |
| `combE` | **Combined electricity consumption** | **kWh / 100 miles** | EV consumption source (the metric we want for EVs) |
| `combinedCD` | Combined gasoline consumption in charge-depleting mode | gal / 100 mi | PHEV (not needed if we map PHEV→gas) |
| `VClass` | EPA vehicle size class ("Compact Cars", "Standard Pickup Trucks", "Sport Utility Vehicle"…) | text | optional segment exclusion |

[All field names CITED: fueleconomy.gov/feg/ws/index.shtml "Data Description → vehicle"]

**Key gotcha:** for EVs, do **NOT** use `comb08` (it's MPGe, an energy-equivalent fiction). Use `combE` (real kWh/100mi). For ICE/diesel use `comb08` (or `comb08U`).

## Code Examples — Unit Conversion (CAT-02), verified formulas

### ICE / diesel: US combined MPG → L/100km
```ts
// 1 US gallon = 3.785411784 L ; 1 mile = 1.609344 km
// L/100km = (3.785411784 / 1.609344) * 100 / MPG = 235.214583 / MPG
const MPG_TO_L_PER_100KM = 235.214583; // exact constant

function mpgToLper100km(mpg: number): number | null {
  if (!mpg || mpg <= 0) return null;        // never fabricate; skip bad rows
  return Math.round((MPG_TO_L_PER_100KM / mpg) * 10) / 10; // 1 decimal, matches ADEME rounding
}
// Worked: 30 MPG → 235.214583/30 = 7.84 → 7.8 L/100km
//         50 MPG → 4.70 → 4.7 L/100km   |   25 MPG → 9.41 → 9.4 L/100km
```
[VERIFIED: arithmetic from US gallon (3.785411784 L) and mile (1.609344 km) definitions; 235.214583 is the standard EPA↔metric constant]

### EV: EPA kWh/100mi → kWh/100km
```ts
// combE is already kWh per 100 MILES. 100 miles = 160.9344 km.
// kWh/100km = combE / 1.609344
const MILES_TO_KM = 1.609344;

function combEToKwhPer100km(combE: number): number | null {
  if (!combE || combE <= 0) return null;
  return Math.round((combE / MILES_TO_KM) * 10) / 10; // 1 decimal
}
// Worked: combE 30 kWh/100mi → 30/1.609344 = 18.64 → 18.6 kWh/100km
//         combE 25 → 15.5     |   combE 38 → 23.6
```
[VERIFIED: 1 mile = 1.609344 km; combE units CITED from EPA field docs]

> Note: the **ADEME** electric path uses Wh/km × 0.1 → kWh/100km (already in `vehicle-sync.service.ts:computeConsumption`). EPA's `combE` is per-100-miles, hence the different divisor. Keep the two conversions in their respective adapters; do not share one function.

> CONTEXT mentions "Wh/km → kWh/100km" as a canonical conversion — that is the **ADEME** unit (×0.1), already implemented. EPA EVs use the `combE / 1.609344` formula above. Document both.

## EPA `fuelType1`/`atvType` → app `FuelType` mapping

The app enum: `SP95 | SP95_E10 | SP98 | DIESEL | E85 | GPL | ELECTRIC`. EPA has no SP95/SP98 distinction (US octane grades differ) — map all gasoline to **`SP95`** (the same convention the ADEME sync uses: `ESSENCE → SP95`). Decide on `fuelType1` first, then refine with `atvType`/`fuelType2`.

| EPA `fuelType1` (and/or `atvType`) | App `FuelType` | Consumption source | Notes |
|------------------------------------|----------------|--------------------|-------|
| `Regular Gasoline` / `Premium Gasoline` / `Midgrade Gasoline` | `SP95` | `comb08` → L/100km | US octane ≠ FR; collapse to SP95 (matches ADEME) |
| `Diesel` (or `atvType=Diesel`) | `DIESEL` | `comb08` → L/100km | |
| `Electricity` (or `atvType=EV`) | `ELECTRIC` | `combE` → kWh/100km | use `combE`, NOT `comb08` |
| `atvType = Plug-in Hybrid` (PHEV) | `SP95` ⚠️ | `comb08` (gas-mode MPG) → L/100km | **AMBIGUITY** — see below. Map to the gasoline side, mirroring ADEME (`ELEC+ESSENC HR → SP95`). |
| `atvType = Hybrid` (non-plug-in, e.g. Prius) | `SP95` | `comb08` → L/100km | Already an MPG figure; treat as gasoline (matches ADEME `ESS+ELEC HNR → SP95`) |
| `E85` / `fuelType` contains `E85`/`Ethanol` / `atvType=FFV` | `E85` (when E85 figure) or `SP95` (gas figure) | depends which figure | FFVs list both; prefer the gasoline `comb08` row → SP95 unless explicitly the E85 metric. Keep simple: FFV→`SP95`. |
| `CNG` / `atvType=CNG` | **skip** (no `CNG` in enum) | — | App has no CNG; closest is GPL but they differ — **skip** (don't fabricate). Return `null`. |
| `LPG` / Propane | `GPL` | — | Rare in EPA; map if present |
| Hydrogen / Fuel Cell | **skip** | — | not in enum |

**PHEV ambiguity (flag for planner/discuss):** EPA PHEVs have BOTH a gas figure (`comb08` in CD/CS modes) and an electric figure (`combE`). The locked Core Value is *accurate FR cost*. The ADEME sync already collapses plug-in hybrids to their primary fuel (`ELEC+ESSENC HR → SP95`, `ELEC+GAZOLE HR → DIESEL`). **Recommendation: mirror ADEME — map EPA PHEV to its primary combustion fuel (`SP95`/`DIESEL`) using `comb08`.** This keeps one row per model, consistent with ADEME, and avoids inventing a blended figure. `[ASSUMED]` — confirm in discuss; the alternative (emit two rows, one ELECTRIC + one SP95) doubles PHEV entries and complicates the canonical key.

[Mapping basis CITED: EPA field docs for `fuelType1`/`atvType`; collapse-to-SP95 convention from existing `vehicle-sync.service.ts:ENERGIE_TO_FUEL`]

## Relevance Filter (PD4-2) — concrete + defensible

**Insight that simplifies everything:** FR-only marques (Renault, Peugeot, Citroën, DS, Dacia, Opel, Cupra, SEAT, Škoda, Alpine) are **not in the US EPA dataset at all** — they aren't sold in the US. So EPA's contribution is the set of **international makes sold in BOTH the US and France**. The relevance filter is therefore primarily a **brand allow-list**, which is also the lowest-maintenance approach (no segment heuristics to drift).

**Approach (recommended): brand allow-list, applied in `EpaAdapter.normalize()`.** A row whose normalized `make` is not in the allow-list returns `null` (skipped). Optionally add a light `VClass` exclusion as a second filter, but the brand list alone removes the vast majority of US-only noise (Buick, Chrysler, Dodge, RAM, GMC, Lincoln, Cadillac, Chevrolet trucks, etc. — none sold in France).

### EPA-make allow-list seed (marques sold in France that also appear in EPA `make`)
Use EPA's exact spellings (left); normalize to canonical FR brand (right) via a small alias map:

```ts
// EPA make (as it appears in vehicles.csv) → canonical brand (FR spelling)
const EPA_BRAND_ALLOWLIST: Record<string, string> = {
  'Audi': 'Audi',
  'BMW': 'BMW',
  'MINI': 'Mini',
  'Mercedes-Benz': 'Mercedes',          // ADEME often "Mercedes" — alias to match
  'Volkswagen': 'Volkswagen',
  'Volvo': 'Volvo',
  'Porsche': 'Porsche',
  'Toyota': 'Toyota',
  'Lexus': 'Lexus',
  'Honda': 'Honda',
  'Nissan': 'Nissan',
  'Mazda': 'Mazda',
  'Mitsubishi': 'Mitsubishi',
  'Subaru': 'Subaru',                   // niche in FR but sold
  'Hyundai': 'Hyundai',
  'Kia': 'Kia',
  'Genesis': 'Genesis',
  'Land Rover': 'Land Rover',
  'Jaguar': 'Jaguar',
  'Fiat': 'Fiat',
  'Alfa Romeo': 'Alfa Romeo',
  'Maserati': 'Maserati',
  'Tesla': 'Tesla',
  'Ford': 'Ford',                       // Ford sells in FR (Puma, Kuga, Focus…) — but US lineup differs; brand kept, models may not overlap
  'Jeep': 'Jeep',
  'Smart': 'Smart',
  'Polestar': 'Polestar',
};
// Brands deliberately EXCLUDED (US-only / not in FR market):
//   Buick, Cadillac, Chevrolet, Chrysler, Dodge, GMC, RAM, Lincoln, Acura,
//   Infiniti, Hummer, Pontiac, Saturn, Mercury, Scion, Ford trucks lineup, etc.
```
[Allow-list `[ASSUMED]` — derived from FR-market knowledge; confirm/trim in discuss. Coverage tuning is expected: too aggressive loses common models, too loose lets US noise in.]

**Why brand allow-list over body-class exclusion:** `VClass` exclusion (drop "Standard Pickup Trucks", "Vans") is fragile — many SUVs ARE sold in France. The brand list is binary and maintainable. Use `VClass` only as an optional secondary trim (e.g. additionally drop `Standard Pickup Trucks` for allow-listed US brands like Ford). Keep it minimal.

**Net effect on CAT-04:** EPA ~48k rows → allow-list keeps maybe ~15–25k → after model-name dedup + ADEME-precedence merge → **adds a few thousand FR-relevant models** on top of ADEME's ~266. Meets "thousands". The exact number is a tuning outcome; verify after a dry run.

## Canonical Key + Dedup/Merge (CAT-03, PD4-1)

### Canonical key
- **Key = `brand|model|fuelType`** — **year is NOT in the key.** (The existing ADEME sync already keys this way with `year=null`; including year would multiply rows and break cross-source matching since EPA has per-year rows.) The merge collapses all years of a model to one canonical entry; keep the most recent/representative consumption per precedence rules.
- **Normalization (reuse + extend `vehicle-sync.service.ts` helpers):**
  - Brand: `normalizeBrand` (trim → `UPPERCASE_BRANDS` set stays uppercase, else Title Case) **+** apply `EPA_BRAND_ALLOWLIST` alias so EPA "Mercedes-Benz" → "Mercedes" matches ADEME.
  - Model: `normalizeModel` (Title Case) **+ strip trim noise** for EPA (EPA models carry engine/trim suffixes: "Golf GTI", "3 Series xDrive30i"). Recommend a conservative trim-strip (e.g. take the leading model token(s); drop trailing displacement/drivetrain tokens) — accept that cross-source model matching is imperfect (see Pitfalls).
  - **Merge map key is uppercased**: `` `${brand}|${model}|${fuelType}`.toUpperCase() `` for case-insensitive matching; store the display-cased values.

### ADEME-precedence merge algorithm (first-writer-wins, precedence-ordered)
```ts
// precedence: lower = higher priority. ademe=0, epa=10.
const adapters = [new AdemeAdapter(), new EpaAdapter()]
  .sort((a, b) => a.precedence - b.precedence);

const merged = new Map<string, CanonicalVehicle>(); // key = uppercased canonical key
for (const adapter of adapters) {                    // ADEME first
  const raws = await adapter.load();
  for (const raw of raws) {
    const v = adapter.normalize(raw);                // → CanonicalVehicle | null
    if (!v) continue;                                // skip unmapped fuel / missing conso / filtered brand
    const key = `${v.brand}|${v.model}|${v.fuelType}`.toUpperCase();
    if (!merged.has(key)) merged.set(key, v);        // FIRST writer wins → ADEME wins on overlap (PD4-1)
    // EPA arrives second → only fills keys ADEME didn't have
  }
}
// then upsert merged.values() with ON CONFLICT (brand, model, fuel_type)
```
This is **idempotent** (CAT-05): re-running rebuilds the same Map and the DB `ON CONFLICT` makes inserts no-ops/refreshes. The DB `UNIQUE` index is the safety net if two normalized rows still collide.

### Idempotent DB upsert (TypeORM QueryBuilder)
```ts
// ADEME rows: refresh on conflict (ADEME is authoritative)
await repo.createQueryBuilder()
  .insert().into(VehicleModel).values(ademeRows)
  .orUpdate(['consumption', 'battery_capacity_kwh', 'tank_capacity_liters', 'source'],
            ['brand', 'model', 'fuel_type'])   // conflict target = canonical UNIQUE
  .execute();

// EPA rows: do nothing on conflict (never overwrite ADEME) — PD4-1
await repo.createQueryBuilder()
  .insert().into(VehicleModel).values(epaRows)
  .orIgnore()                                   // ON CONFLICT DO NOTHING
  .execute();
```
With the in-memory first-writer-wins merge, EPA rows that overlap ADEME are already dropped before insert; `orIgnore()` is belt-and-suspenders. Run in batches of `BATCH_SIZE` (100), mirroring the existing sync.

### Source-adapter interface (CAT-05 extensibility)
```ts
export interface CanonicalVehicle {
  brand: string;
  model: string;
  fuelType: FuelType;
  consumption: number;              // L/100km (ICE) or kWh/100km (EV) — already converted
  batteryCapacityKwh: number | null;
  tankCapacityLiters: number | null;
  source: string;                   // 'ademe' | 'epa' | future
}

export interface CatalogSourceAdapter {
  readonly source: string;          // provenance tag written to the row
  readonly precedence: number;      // 0 = highest priority (ADEME); 10 = EPA; new source picks a number
  load(): Promise<unknown[]>;       // ADEME: paginated fetch (dev) OR committed snapshot; EPA: read committed CSV
  normalize(raw: unknown): CanonicalVehicle | null;  // unit conversion + fuel map + filter; null = skip
}
```
A 3rd source = implement one `CatalogSourceAdapter`, add it to the array, pick a precedence. **No change** to the merge loop, the DB schema, or the upsert. This is the CAT-05 guarantee.

> **Refactor note:** the existing `VehicleSyncService.doSync()` is essentially `AdemeAdapter.load()+normalize()` + the merge/insert orchestration inlined. Generalize by extracting the ADEME-specific bits into `AdemeAdapter` and turning `doSync` into the precedence-ordered orchestrator over `CatalogSourceAdapter[]`. Keep `OnApplicationBootstrap` + `STARTUP_THRESHOLD` behavior (skip if already populated).

## Schema + Scale (Schema migration + indexing)

### Entity changes (`vehicle-model.entity.ts`)
Add one provenance column. `source_id`/`market` are **YAGNI** for now (the canonical key + `source` tag suffice; a `market` field is redundant since `source` implies market). Add later behind a new migration if a 3rd source needs it.
```ts
@Column({ type: 'varchar', length: 16, default: 'ademe' })
source!: string;     // 'ademe' | 'epa' — provenance (CAT-02). Plain varchar (NOT enum) for CAT-05 extensibility.
```
Keep `year` (EPA can populate it; ADEME leaves null) — it stays metadata, not key.

### Migration (hand-written, reversible, IF [NOT] EXISTS — mirrors `1748000000000` style)
```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceAndCatalogIndexes1748100000000 implements MigrationInterface {
  name = 'AddSourceAndCatalogIndexes1748100000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1. provenance column (existing rows default to 'ademe')
    await q.query(`ALTER TABLE "vehicle_models"
      ADD COLUMN IF NOT EXISTS "source" VARCHAR(16) NOT NULL DEFAULT 'ademe'`);

    // 2. trigram extension for fast ILIKE substring search (CAT-06)
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // 3. canonical-key UNIQUE index — enforces dedup + enables ON CONFLICT upsert (CAT-03/CAT-05)
    //    NOTE: dedupe existing rows BEFORE this if any (brand,model,fuel_type,year=null) collide.
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vehicle_models_canonical"
      ON "vehicle_models" ("brand", "model", "fuel_type")`);

    // 4. btree on brand — ordering + brand grouping/filter (catalog sorts by brand,model)
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_brand"
      ON "vehicle_models" ("brand")`);

    // 5. trigram GIN — index-backed ILIKE '%term%' on brand+model
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_search_trgm"
      ON "vehicle_models" USING gin ((lower("brand" || ' ' || "model")) gin_trgm_ops)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_search_trgm"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_brand"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_vehicle_models_canonical"`);
    await q.query(`ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "source"`);
    // leave pg_trgm extension installed (other features may use it)
  }
}
```
**Caveats for the planner:**
- The `UNIQUE` index will **fail** if existing `vehicle_models` already contains duplicate `(brand, model, fuel_type)`. The ADEME sync dedups in-memory so production data *should* be clean, but the migration must either run a dedupe `DELETE` first (keep `MIN(id)` per group) or the planner must verify uniqueness on the live DB before deploy. **Add a guard step.**
- `CREATE EXTENSION pg_trgm` requires the DB role to have permission. Supabase/Neon/Render Postgres all permit it; verify on the target (Environment Availability below).
- `migrationsRun:true` means this auto-runs on the next Render deploy — sequence the dedupe/uniqueness check accordingly.

### Indexing verdict for ~thousands of rows
At single-digit-thousands, **any** of these is fast. The pragmatic, correct set: `UNIQUE(brand,model,fuel_type)` (correctness + upsert), `btree(brand)` (ordering/grouping), `pg_trgm GIN` (search). If `pg_trgm` is unavailable on the target, drop index #5 — `ILIKE` seq-scan over a few thousand rows is still <5ms.

## Server-side Search/Pagination API + Showroom Rework (CAT-06)

### Extend `GET /vehicles/catalog` (the response shape is already correct)
`findCatalog` already returns `{ items, total, page, limit, totalPages }` and supports `search` + `fuelType` + `page` + `limit`. Changes:
1. **DTO:** add optional `brand?: string` to `CatalogQueryDto` (exact-brand filter for "load more within a brand"). Keep `search`, `fuelType`, `page`, `limit`. `@IsOptional()` + `@IsString()`.
2. **Query:** switch the `LIKE` to `ILIKE` so the `pg_trgm` index applies, and search the concatenation to match the index expression:
   ```ts
   if (search) qb.andWhere(`lower(vm.brand || ' ' || vm.model) ILIKE :s`, { s: `%${search.toLowerCase()}%` });
   if (brand)  qb.andWhere('vm.brand = :brand', { brand });
   if (fuelType) qb.andWhere('vm.fuelType = :fuelType', { fuelType });
   qb.orderBy('vm.brand','ASC').addOrderBy('vm.model','ASC').skip((page-1)*limit).take(limit);
   ```
3. **Optional brand-facet endpoint** (helps the brand directory without loading all rows): `GET /vehicles/catalog/brands?fuelType=&search=` → `[{ brand, count }]` via `SELECT brand, COUNT(*) ... GROUP BY brand ORDER BY brand`. Lets the showroom render the brand jump-list + counts without client load-all. **Recommended** — it's the clean way to keep brand grouping at scale.

**Response contract (frozen for Phase 5 mobile reuse):**
```jsonc
// GET /vehicles/catalog?search=golf&fuelType=DIESEL&page=1&limit=20&brand=Volkswagen
{
  "items": [ { "id","brand","model","year","fuelType","consumption",
               "batteryCapacityKwh","tankCapacityLiters","source" } ],
  "total": 134, "page": 1, "limit": 20, "totalPages": 7
}
// GET /vehicles/catalog/brands?fuelType=ELECTRIC   (optional facet)
[ { "brand": "Tesla", "count": 12 }, { "brand": "Volkswagen", "count": 9 } ]
```
Add `source` to the web `VehicleModel` type (`web/src/types/api.ts`) so the UI can optionally show provenance.

### Showroom rework (`web/src/app/app/garage/add/page.tsx`) — DATA LAYER ONLY
Replace the load-all `useEffect` (lines 53–84) + client `useMemo` filtering (87–105) with server-side fetching. **Keep all Phase 3 visuals** (sticky toolbar, `FUEL_FILTERS` chips, `BrandAvatar`, `FuelBadge`, brand sections, the `ModelCard`, the config `Modal`).

Pattern:
- `const debounced = useDebounce(search, 300)` (reuse existing hook).
- `useEffect` on `[debounced, fuelFilter, page]` → `apiClient.get('/vehicles/catalog', { params })`. Map the `fuelFilter` chip → `fuelType` param. The `essence` chip maps to multiple types (`SP95|SP95_E10|SP98`); since the API takes a single `fuelType`, either (a) make the chips single-fuel, or (b) add `fuelCategory` support to the API mirroring `toCategory()`/`categoryToFuelTypes`. **Recommend (b)** — add `fuelCategory?: 'gas'|'diesel'|'ev'|'gpl'` to `CatalogQueryDto` reusing the existing `FuelCategory` mapping (consistent with the rest of the app, and what mobile will want).
- Pagination: "Charger plus" button (append next page to `items`) OR infinite scroll — pick "Charger plus" (matches the trips/history pattern already in the app). Reset to page 1 when `debounced`/`fuelFilter` change.
- Brand grouping: group the **current accumulated items** client-side (the existing `grouped` `useMemo` works unchanged over the loaded subset). Optionally drive the brand jump-list from the `/brands` facet.
- Remove `MAX_PAGES` / the parallel load-all entirely.

This keeps the editorial-dark UI identical while making the data layer scale — exactly the CAT-06 mandate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Substring/fuzzy catalog search | Custom in-memory filter loaded into the browser (current code) | SQL `ILIKE` + `pg_trgm` GIN index, server-side | The whole CAT-06 bug is client load-all; never re-load all rows to filter |
| Idempotent upsert | `findOneBy` + branch per row (the `import-ademe.ts` per-row loop) | Batched `INSERT ... ON CONFLICT` (`orUpdate`/`orIgnore`) on the UNIQUE key | Per-row finds are O(n) round-trips; `ON CONFLICT` is one statement per batch and atomic |
| Dedup enforcement | Hope the in-memory Map is enough | DB `UNIQUE(brand,model,fuel_type)` | The Map can be bypassed (manual inserts, race); the constraint is the real guarantee |
| CSV parsing with quoted fields | `line.split(',')` | quote-aware splitter or `csv-parse` (gated) | EPA model/description fields contain commas inside quotes — naive split corrupts columns |
| MPG/kWh conversions | Approximate "÷ 235" magic numbers scattered | the two named constants above (`235.214583`, `1.609344`) in the adapter | Correctness + traceability; matches EPA's own constant |
| Multi-fuel chip → query | Multiple round-trips per chip | `fuelCategory` param reusing `toCategory()`/`categoryToFuelTypes` | DRY with existing app fuel-category logic; one query |

**Key insight:** This phase is mostly *re-plumbing proven pieces* (ADEME sync, catalog query, showroom UI) onto a scalable spine (adapter interface + ON CONFLICT + indexes + server-side search). The risk is in the EPA data quality (model-name noise, PHEV), not in the infrastructure.

## Common Pitfalls

### Pitfall 1: EPA CSV quoted fields break naive `split(',')`
**What goes wrong:** EPA `model`/description fields contain commas inside double-quotes; `line.split(',')` mis-aligns every subsequent column → garbage brand/fuel/consumption.
**Why:** `import-ademe.ts` uses `split(';')` (ADEME is semicolon-delimited, clean). EPA is comma-delimited with RFC-4180 quoting.
**How to avoid:** Inspect the real `vehicles.csv` for embedded commas in `make`/`model`/the fuel/economy columns. If present, use a quote-aware splitter or `csv-parse` (gated). Since we commit a **trimmed snapshot** (PD4-3), an even safer move: during the one-time dev export, write the snapshot with a clean delimiter (e.g. re-emit only the needed columns as `;`-delimited) so the committed file parses with the existing `readline` splitter and no new dependency.
**Warning sign:** brands like "Audi" appearing in the consumption column.

### Pitfall 2: model-name noise → cross-source dedup misses
**What goes wrong:** EPA "Golf GTI 2.0T" vs ADEME "Golf" don't match the canonical key → the same car appears twice (EPA + ADEME), violating CAT-03.
**Why:** EPA encodes trim/engine/drivetrain in `model`; ADEME is coarser.
**How to avoid:** Conservative trim-strip in `EpaAdapter.normalize()` (leading token(s), drop trailing displacement/drivetrain). Accept imperfection — ADEME-precedence + the brand allow-list bound the damage; a residual duplicate is far better than a missing model. Document the trim-strip rules so they're tunable.
**Warning sign:** post-sync, search "Golf" returns near-duplicate VW rows differing only by trim.

### Pitfall 3: using `comb08` (MPGe) for EVs
**What goes wrong:** EVs get a nonsense L/100km from MPGe.
**How to avoid:** Branch on fuel: EV → `combE` (kWh/100mi); ICE/diesel → `comb08`. Never run `combE` through the MPG formula.
**Warning sign:** EV consumptions like "2.1 L/100km".

### Pitfall 4: rows with MPG=0 / missing metric / electric-only PHEV figures
**What goes wrong:** division by zero or fabricated consumption.
**How to avoid:** `if (!mpg || mpg <= 0) return null` and `if (!combE || combE <= 0) return null` — skip the row (Core Value: no fabricated consumption). Mirrors the ADEME `if (!consumption) continue`.

### Pitfall 5: UNIQUE index creation fails on existing duplicates
**What goes wrong:** `migrationsRun:true` auto-runs on deploy; `CREATE UNIQUE INDEX` errors if prod has dup `(brand,model,fuel_type)` → deploy crash loop.
**How to avoid:** Add a dedupe step (keep `MIN(id)` per group) in the migration `up` BEFORE the unique index, or verify uniqueness on the live DB pre-deploy. Test the migration against a copy of prod data.

### Pitfall 6: committed CSV size in the repo
**What goes wrong:** the raw `vehicles.csv` is large (~30–60 MB) → bloats the repo, slows clones, may hit host limits.
**How to avoid:** Commit a **trimmed snapshot** — only the needed columns, only allow-listed brands, gzipped or as a compact `;`-delimited file. PD4-3 wants reproducibility, not the full raw file. Target a few MB. Document the trim provenance (date pulled, columns kept) in a header comment.

### Pitfall 7: PHEV double-counting
**What goes wrong:** Mapping PHEVs to both ELECTRIC and SP95 doubles entries and confuses the canonical key.
**How to avoid:** Per the recommendation, map PHEV → primary combustion fuel (`SP95`/`DIESEL`) using `comb08`, one row per model (mirrors ADEME). Confirm in discuss.

### Pitfall 8: brand alias mismatch (Mercedes-Benz vs Mercedes)
**What goes wrong:** EPA "Mercedes-Benz" and ADEME "Mercedes" produce different keys → duplicates.
**How to avoid:** The `EPA_BRAND_ALLOWLIST` map outputs the **canonical FR brand spelling** ADEME uses. Audit the actual ADEME brand spellings (query distinct brands from the live catalog) and align the alias map's right-hand side to them.

## Requirements → Implementation Map

| Req | Implementation | Verification |
|-----|----------------|--------------|
| CAT-01 | `CatalogSourceAdapter` + `AdemeAdapter` + `EpaAdapter`; EPA snapshot committed; skip rows w/ no source metric | Sync produces rows tagged `source='ademe'` and `source='epa'`; zero rows with consumption not traceable to a source value |
| CAT-02 | `mpgToLper100km` / `combEToKwhPer100km`; EPA→FuelType map; `source` column | Unit tests on the two conversions (worked examples); a random EPA row's consumption matches hand-calc |
| CAT-03 | First-writer-wins merge Map + `UNIQUE(brand,model,fuel_type)` + `ON CONFLICT` | `SELECT brand,model,fuel_type,COUNT(*) ... HAVING COUNT(*)>1` returns 0 rows |
| CAT-04 | EPA allow-list ingestion adds thousands | `SELECT COUNT(*) FROM vehicle_models` ≫ 266; spot-check common international models present |
| CAT-05 | Idempotent `ON CONFLICT` + adapter array | Run sync twice → second run inserts 0 / updates only; adding a stub 3rd adapter requires no merge/schema change |
| CAT-06 | Extended `GET /vehicles/catalog` (ILIKE + brand + fuelCategory) + `/brands` facet + indexes + showroom rework | Showroom network tab shows paginated requests (not N pages up front); search hits the API debounced; brand grouping preserved; fast at thousands of rows |

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-row `findOneBy` + save (import-ademe) | Batched `INSERT ... ON CONFLICT` | One statement per batch, atomic idempotency |
| Single source, year-less key inline in `doSync` | `CatalogSourceAdapter` precedence merge | Drop-in 3rd source (CAT-05) |
| Client load-all then in-memory filter (showroom) | Server-side `ILIKE` + pagination + `pg_trgm` | Scales to thousands; mobile-reusable API |
| `LIKE` (case-sensitive-ish, no index) | `ILIKE` + trigram GIN | Index-backed substring search |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Postgres `pg_trgm` extension | CAT-06 fast search | likely ✓ (Supabase/Neon/Render permit it) | builtin contrib | drop the GIN index → `ILIKE` seq-scan (fine at thousands of rows) |
| Node `fs`/`readline` | EPA CSV parse | ✓ | Node 20 builtin | — |
| EPA `vehicles.csv` (one-time dev download) | building the committed snapshot | ✓ (public domain, stable URL) | — | data.gov mirror / Kaggle mirror |
| `csv-parse` (conditional) | only if EPA file has embedded-comma quoted columns | ✗ (not installed) | — | quote-aware manual splitter, or re-emit snapshot as `;`-delimited (preferred) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `pg_trgm` (→ seq-scan), `csv-parse` (→ clean snapshot delimiter).

**Verify before planning:** confirm `CREATE EXTENSION pg_trgm` succeeds on the target DB role (run once in dev), and inspect the real `vehicles.csv` quoting + distinct ADEME brand spellings (to align the alias map).

## Validation Architecture

> `workflow.nyquist_validation` not found in this session's config read — treating as enabled. (Planner: confirm `.planning/config.json`.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 (backend); e2e via `test/jest-e2e.json` (SQLite in-memory) |
| Config file | `backend/jest.config` (unit) + `backend/test/jest-e2e.json` (e2e) |
| Quick run command | `npx jest src/vehicles --forceExit` (unit) |
| Full suite command | `npx jest --config test/jest-e2e.json --forceExit` (currently 143/143 green) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command | File Exists? |
|-----|----------|-----------|---------|--------------|
| CAT-02 | `mpgToLper100km(30)=7.8`, `combEToKwhPer100km(30)=18.6`, `<=0 → null` | unit | `npx jest src/vehicles/adapters` | ❌ Wave 0 |
| CAT-02 | EPA→FuelType map (gasoline→SP95, electricity→ELECTRIC, PHEV→SP95, CNG→null) | unit | same | ❌ Wave 0 |
| CAT-03 | merge: ADEME wins on overlap; EPA fills gaps; uppercased key collision | unit | `npx jest src/vehicles/catalog-merge` | ❌ Wave 0 |
| CAT-05 | sync twice → no new rows second run | e2e | `npx jest --config test/jest-e2e.json --testPathPatterns=vehicles` | ⚠️ extend existing |
| CAT-06 | `GET /vehicles/catalog?search=&fuelCategory=&brand=&page=` shape + pagination + total | e2e | same | ⚠️ extend existing |
| CAT-06 | `GET /vehicles/catalog/brands` facet shape | e2e | same | ❌ Wave 0 |

> **SQLite e2e caveat:** the e2e suite runs SQLite in-memory (no `pg_trgm`, `ILIKE` semantics differ, `ON CONFLICT` target needs a matching index). The unique index + `ILIKE` query must degrade gracefully under SQLite for tests, or those assertions run against `LIKE`. Test the **merge logic** (pure functions) in unit tests where it's DB-agnostic; keep e2e to API-shape assertions. Existing e2e adds the `Trip` entity to the entities list per-suite — the new `source` column rides along automatically.

### Wave 0 Gaps
- [ ] `src/vehicles/adapters/conversions.spec.ts` — CAT-02 conversion + fuel-map unit tests
- [ ] `src/vehicles/catalog-merge.spec.ts` — CAT-03/CAT-05 precedence + idempotency unit tests
- [ ] Extend `test/vehicles.e2e-spec.ts` — catalog search/pagination/brand-facet (CAT-06)
- [ ] Migration tested against a prod-data copy for the UNIQUE index (Pitfall 5)

*(No new framework install — Jest already present.)*

## Security Domain

> `security_enforcement` not explicitly read; included per default-enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V5 Input Validation | yes | `CatalogQueryDto` via global `ValidationPipe` (`whitelist`+`forbidNonWhitelisted`); `@IsEnum`/`@IsInt`/`@Min`/`@Max` on new params |
| V5 Injection | yes | TypeORM **parameterized** QueryBuilder for `ILIKE`/brand/fuel — never string-concatenate `search` into SQL (the `%${search}%` value goes through a bound `:s` parameter, as the existing code does) |
| V2/V3/V4 Auth/Session/Access | no | `GET /vehicles/catalog` is public (catalog is non-sensitive); no change |
| V6 Cryptography | no | none in scope |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| SQL injection via `search`/`brand` | Tampering | Bound parameters only (QueryBuilder `:param`); `ILIKE` value parameterized |
| Unbounded result / pagination abuse | DoS | `@Max(100)` on `limit` (already present); keep it |
| Committed CSV containing untrusted markup | — | Catalog text is rendered as React text (auto-escaped); no `dangerouslySetInnerHTML` in showroom — safe. (Unrelated existing MapboxMap `setHTML` sink is out of scope.) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | EPA `vehicles.csv` ≈ 48k rows | EPA Dataset Facts | Low — only affects "thousands" estimate; tunable post-dry-run |
| A2 | EPA CSV has RFC-4180 quoted fields with embedded commas | EPA Facts / Pitfall 1 | Medium — wrong parser corrupts data; **inspect real file first** |
| A3 | EPA data is public domain (US §105) | EPA Facts | Low — US federal works are public domain; safe to commit |
| A4 | PHEV → primary combustion fuel (SP95/DIESEL), one row | Fuel mapping | Medium — alternative (split rows) changes row counts + key design; **confirm in discuss** |
| A5 | Brand allow-list (the seed list) covers FR-relevant EPA makes | Relevance Filter | Medium — too tight loses models, too loose admits noise; **tune after dry run, confirm in discuss** |
| A6 | Including `year` in the canonical key is wrong (exclude it) | Canonical Key | Low — matches existing ADEME behavior; excluding year is the consistent choice |
| A7 | `csv-parse` exists/maintained on npm | Package Audit | Low — gated behind checkpoint; avoidable via clean-delimiter snapshot |
| A8 | `pg_trgm` is permitted on the target DB role | Schema / Env | Low — falls back to seq-scan |
| A9 | ADEME brand spellings (e.g. "Mercedes") that the alias map targets | Pitfall 8 | Medium — verify by querying distinct brands from the live catalog |

## Open Questions

1. **PHEV representation** — one row (primary fuel) vs two rows (ELECTRIC + combustion)?
   - Known: ADEME collapses to primary fuel. EPA exposes both metrics.
   - Recommendation: collapse to primary fuel (A4) for consistency; confirm in discuss.
2. **Brand allow-list final membership** — is the seed too tight/loose? Include Ford (US lineup barely overlaps FR)?
   - Recommendation: ship the seed, run a dry-run sync, eyeball the added models, trim. Confirm in discuss.
3. **Committed snapshot format/size** — raw trimmed CSV vs gzipped vs re-emitted `;`-delimited?
   - Recommendation: re-emit only needed columns, allow-listed brands, `;`-delimited (parses with existing `readline`, no new dep), few MB. Header comment with pull date + columns.
4. **e2e under SQLite** — how much of the merge/search to assert in e2e vs unit?
   - Recommendation: pure merge/conversion logic in unit (DB-agnostic); API shape in e2e; don't assert `pg_trgm`-specific behavior in SQLite.

## Sources

### Primary (HIGH confidence)
- fueleconomy.gov Web Services / Data Description — `https://www.fueleconomy.gov/feg/ws/index.shtml` — bulk download URL, file names, field/column documentation (`make`, `model`, `year`, `fuelType1/2`, `atvType`, `comb08`, `comb08U`, `combE`, `combinedCD`, `VClass`)
- Codebase (read directly): `vehicle-model.entity.ts`, `vehicle-sync.service.ts`, `import-ademe.ts`, `vehicles.service.ts`, `vehicles.controller.ts`, `catalog-query.dto.ts`, `fuel-type-categories.ts`, `database.config.ts`, migrations `1747701000000`/`1748000000000`, `garage/add/page.tsx`, `web/src/types/api.ts`
- Unit-conversion constants — derived from SI definitions (US gallon = 3.785411784 L; mile = 1.609344 km) → `235.214583 / MPG`, `combE / 1.609344`

### Secondary (MEDIUM confidence)
- data.gov "Vehicle Fuel Economy" catalog entry + Kaggle "Vehicle Fuel Economy Estimates 1984-2017" — corroborate dataset identity, coverage, and U.S. Government Work provenance (row-count not exactly confirmed)

### Tertiary (LOW confidence)
- Brand allow-list membership + ADEME brand spellings — FR-market knowledge + the existing `UPPERCASE_BRANDS` set; **must be validated against the live ADEME catalog** before locking

## Metadata

**Confidence breakdown:**
- EPA dataset facts (file/URL/columns): HIGH — official docs verified
- Conversion formulas: HIGH — SI-derived, worked examples
- Fuel mapping: MEDIUM-HIGH — table clear; PHEV is a real decision (A4)
- Relevance filter / allow-list: MEDIUM — defensible approach, membership needs tuning (A5/A9)
- Merge/dedup + adapter architecture: HIGH — generalizes proven code + DB constraint
- Schema/indexing: HIGH — standard Postgres; pg_trgm/unique-index caveats flagged
- Search API + showroom rework: HIGH — extends existing shape; data-layer-only change

**Research date:** 2026-06-02
**Valid until:** ~2026-09-02 (EPA dataset/URL stable; revisit if fueleconomy.gov restructures `ws/epadata`)
