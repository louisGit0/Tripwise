---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts
  - backend/src/vehicles/entities/vehicle-model.entity.ts
  - backend/src/vehicles/adapters/conversions.ts
  - backend/src/vehicles/adapters/conversions.spec.ts
  - backend/src/vehicles/adapters/catalog-source-adapter.interface.ts
  - backend/src/vehicles/adapters/ademe.adapter.ts
  - backend/src/vehicles/adapters/epa.adapter.ts
  - backend/src/vehicles/adapters/catalog-merge.spec.ts
  - backend/src/vehicles/vehicle-sync.service.ts
  - backend/src/vehicles/vehicles.service.ts
  - backend/src/vehicles/vehicles.controller.ts
  - backend/src/vehicles/dto/catalog-query.dto.ts
  - backend/src/common/fuel-type-categories.ts
  - backend/src/scripts/build-epa-snapshot.ts
  - web/src/app/app/garage/add/page.tsx
  - web/src/types/api.ts
  - backend/src/data/epa-vehicles.snapshot.csv
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: resolved
fixed: [CR-01, CR-02, CR-03, WR-01, WR-02, WR-04]
deferred: [WR-03, WR-05, WR-06, IN-01, IN-02, IN-03, IN-04]
fix_commit: 7996a03
---

# Phase 4: Code Review Report — Multi-Source Vehicle Catalog + Scaled Showroom

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 15 (+ committed EPA snapshot)
**Status:** issues_found

## Summary

The conversion math, the merge orchestrator, and the search API are largely correct and well-tested: the two unit conversions are exact (235.214583/MPG and combE/1.609344), EVs read `combE` not `comb08`, ≤0 guards return `null` (no fabricated consumption), the merge is genuinely first-writer-wins with ADEME precedence and proven idempotent, search params are bound (no SQL injection), pagination is capped at 100, and the showroom is a clean cancellable server-side rewrite with no load-all remnant.

However, three Critical defects undermine the phase's correctness stakes:

1. **The auto-run migration can crash the production deploy.** The dedupe `DELETE` runs against a table whose `vehicle_models` PK is referenced by `user_vehicles` under `ON DELETE RESTRICT`. If any duplicate canonical row is referenced by a user vehicle, the DELETE raises an FK violation and — because `migrationsRun:true` — the deploy crash-loops. This is the exact Pitfall-5 failure the dedupe was meant to prevent, merely relocated from the unique-index step to the delete step.
2. **The migration's `down()` is not reversible** despite claiming so — the dedupe `DELETE` permanently destroys rows; `down()` cannot restore them.
3. **The committed snapshot contains a corrupted mega-row** (30 KB single line, line 26751) where the snapshot builder's CSV parser swallowed record boundaries, collapsing dozens of raw EPA records into one `model` field. That row ingests as one garbage catalog entry with a multi-KB model name and a consumption parsed from misaligned columns.

Plus quality/robustness warnings around EPA brand-normalization bypass, arbitrary year-collapse winner, snapshot allow-list duplication, FFV E85 mislabeling, and EpaAdapter snapshot-path/error handling.

## Critical Issues

### CR-01: Migration dedupe DELETE can crash the auto-run production deploy via FK RESTRICT

**File:** `backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts:37-44`
**Issue:** The dedupe statement
```sql
DELETE FROM "vehicle_models" a USING "vehicle_models" b
WHERE a.id > b.id AND a.brand = b.brand AND a.model = b.model AND a.fuel_type = b.fuel_type
```
deletes the higher-`id` duplicate of every canonical collision. But `vehicle_models.id` is referenced by `user_vehicles.vehicle_model_id` with `FK_user_vehicles_vehicle_model ... ON DELETE RESTRICT` (`1747699200000-InitialSchema.ts:70-76`). If a production user has added a vehicle whose `vehicle_model_id` happens to be a duplicate row that this DELETE targets, Postgres raises a foreign-key violation, the migration transaction aborts, and because `database.config.ts:19` sets `migrationsRun: true`, the failed migration re-runs on every boot → deploy crash loop. The header comment explicitly claims this DELETE "guarantees the next CREATE UNIQUE INDEX cannot fail" — but it can itself fail harder (mid-transaction abort vs. a clean pre-check).

Secondary concern: `a.id > b.id` on **UUID** ids ("keep MIN(id)") is an arbitrary winner — UUIDs have no meaningful ordering, so which duplicate survives (and which user vehicle keeps a valid FK) is non-deterministic.

**Fix:** Before deleting, repoint any referencing `user_vehicles` to the surviving (kept) row, then delete. Or, since the ADEME sync dedups in-memory and prod "should" be clean, make the dedupe defensive and FK-safe:
```sql
-- Repoint user_vehicles from soon-to-be-deleted dups to the kept row, THEN delete.
WITH dups AS (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY brand, model, fuel_type ORDER BY id) AS keep_id
  FROM "vehicle_models"
)
UPDATE "user_vehicles" uv
   SET vehicle_model_id = d.keep_id
  FROM dups d
 WHERE uv.vehicle_model_id = d.id AND d.id <> d.keep_id;

DELETE FROM "vehicle_models" a USING "vehicle_models" b
 WHERE a.id <> b.id AND a.brand = b.brand AND a.model = b.model AND a.fuel_type = b.fuel_type
   AND a.id > b.id;
```
Test the migration against a copy of prod data with at least one `user_vehicles` row pointing at a duplicate (Pitfall 5 / RESEARCH §"Wave 0 Gaps").

### CR-02: Migration `down()` is not reversible — dedupe DELETE causes irreversible data loss

**File:** `backend/src/database/migrations/1748100000000-AddSourceAndCatalogIndexes.ts:77-91` (and the `up` DELETE at 37-44)
**Issue:** The class doc (lines 14-16) and the inline comment (line 36) assert "`down` is reversible (no schema loss; only redundant rows go)". That is false: `down()` only drops indexes and the `source` column; it cannot restore the rows the `up()` DELETE removed. A migrate-down/migrate-up cycle (or a rollback after a partially-applied deploy) permanently loses catalog rows. Reversibility claims on a destructive migration are a maintenance trap.

**Fix:** Remove the "reversible" claim from the comments, OR move the destructive dedupe out of the schema migration into a separate, clearly one-way data-fix step. At minimum, document explicitly in both `up` and the class doc that the dedupe is **irreversible** and `down()` only reverses the additive schema changes. Consider `CREATE UNIQUE INDEX CONCURRENTLY` is not usable inside the migration transaction, but a non-destructive alternative is to detect duplicates and **fail loudly with a clear remediation message** rather than silently deleting prod rows on boot.

### CR-03: Committed EPA snapshot contains a corrupted 30 KB mega-row → one garbage catalog entry

**File:** `backend/src/data/epa-vehicles.snapshot.csv:26751` (root cause: `backend/src/scripts/build-epa-snapshot.ts:82-127`)
**Issue:** The final data line is 30,883 characters and its `model` field (column 2) contains a concatenation of dozens of raw EPA records — e.g. `Countryman SE ALL4 (18 Wheels),,false,0,0,216,...,Hyundai,Ioniq 9 RWD,...,Dodge,B150/B250 Van 2WD,...,Tue Jan 01 00:00:00 EST 2013,...`. The inline `parseCsv` in `build-epa-snapshot.ts` lost record boundaries for the last block (a stray/unbalanced `"` near the file end leaves `inQuotes` stuck `true`, so subsequent `\n`s are appended to the field instead of terminating records; `\r`-only line endings are also silently dropped at line 115). Because this collapses onto a single output line, `EpaAdapter.load()` reads it as one row: `make=MINI` (allow-listed → kept), `model` = the entire 30 KB blob, and `fuelType1`/`comb08`/`combE` (columns 4/7/8) land on arbitrary mid-blob tokens. Result: one ingested catalog row with a multi-KB model name and a consumption traceable to no real source value — a Core-Value violation (fabricated/garbage consumption) and a malformed showroom entry.

Scope: exactly **1** corrupted line of 26,749 (verified: only one line >1000 chars), so impact is one bad row, not a mass corruption — but it ships in the committed artifact and will appear in the catalog.

**Fix:** (a) Harden `parseCsv` to handle bare `\r` line terminators and to detect/recover from an unterminated quoted field at EOF (e.g. treat EOF-while-`inQuotes` as an error and abort the build rather than emit a giant field). (b) Add a post-parse sanity guard in the builder: skip/reject any output row whose serialized length exceeds a sane bound (e.g. a model > 80 chars) and log it. (c) Add a defensive guard in `EpaAdapter.normalize` to skip rows with an implausibly long model. (d) Regenerate and re-commit a clean snapshot, then spot-check `awk -F';' 'length>200'` returns nothing.

## Warnings

### WR-01: EPA brand bypasses `normalizeBrand` → alias/casing drift risk vs ADEME

**File:** `backend/src/vehicles/adapters/epa.adapter.ts:152` and `:30-58`
**Issue:** ADEME brands flow through `normalizeBrand()` (`ademe.adapter.ts:75-79`), which applies the `UPPERCASE_BRANDS` set and Title-Case. EPA brands instead come straight from the `EPA_BRAND_ALLOWLIST` map's right-hand values, never touching `normalizeBrand`. The two paths can diverge: e.g. ADEME `KIA` (KIA is in `UPPERCASE_BRANDS`) normalizes to `"KIA"`, while the EPA allow-list maps `Kia → "Kia"`. That yields canonical keys `KIA|...` vs `KIA|...` — uppercased key collides, OK — but the **display brand** stored differs by source ("KIA" vs "Kia"), and which one wins depends on merge order, producing inconsistent display casing and a duplicate-looking brand in the showroom brand list. `BMW`/`MINI` are also in `UPPERCASE_BRANDS` (`MG`, `DS`, etc.).
**Fix:** Run the EPA allow-list output through `normalizeBrand()` too (or assert at construction that every allow-list value equals `normalizeBrand(value)`), so both sources emit identical display spelling for the same brand.

### WR-02: Year-collapse winner is arbitrary (file order), not "most recent/representative"

**File:** `backend/src/vehicles/vehicle-sync.service.ts:58-65` + `backend/src/data/epa-vehicles.snapshot.csv` (sorted oldest-first)
**Issue:** RESEARCH §"Canonical Key" says collapse all years "keep the most recent/representative consumption per precedence rules." The merge is first-writer-wins **within** a source too: for EPA, the first row encountered for a `brand|model|fuel` key wins. The snapshot is ordered oldest-first (1985, 1993, … at the top), so for any multi-year EPA model the **oldest** year's consumption is kept — e.g. a 1993 Subaru Legacy's MPG rather than a modern one. That ships a stale, less-accurate consumption for the canonical entry, undercutting the accuracy Core Value for EPA-sourced models.
**Fix:** Either sort EPA rows newest-first before merge, or have `EpaAdapter` pick the max-year row per canonical key during `load()`/normalize, or change the intra-source tie-break to prefer the higher `year`. Document the chosen representative-year rule.

### WR-03: FFV/E85 rows are silently mislabeled SP95 while reading the gasoline metric — acceptable, but E85 chip returns nothing from EPA

**File:** `backend/src/vehicles/adapters/conversions.ts:68, 85`
**Issue:** `isE85` is computed but every FFV/E85 row is mapped to `FuelType.SP95` with `metric:'mpg'` (line 85 comment says "prefer the gasoline figure → SP95"). That matches the RESEARCH "keep simple: FFV→SP95" guidance, so it is intentional — but it means the showroom `E85` chip (`garage/add/page.tsx:46`, `fuelType: 'E85'`) will surface only ADEME `SUPERETHANOL` rows; EPA contributes zero E85 models even though EPA flags FFVs. The `isE85` variable is effectively dead (computed, then only used to route to SP95, identical to the gasoline branch).
**Fix:** Confirm this is the locked decision (A4-adjacent). If so, drop the dead `isE85`/`f2` computation for clarity, or actually emit `E85` when the row's metric is the ethanol figure. Document that EPA never yields E85.

### WR-04: `EpaAdapter` has no guard if the snapshot file is missing → unhandled stream error crashes the background sync

**File:** `backend/src/vehicles/adapters/epa.adapter.ts:124-146`
**Issue:** `load()` does `fs.createReadStream(this.snapshotPath)` with no existence check and no try/catch. If the snapshot is absent from `dist/data/` (e.g. nest-cli `assets` copy misconfig, or a partial deploy), the stream emits an `ENOENT` error that rejects the `for await` loop. That propagates up through `mergeCanonical` → `doSync` → the `void this.syncFromAdeme().catch(...)` at `vehicle-sync.service.ts:121`, which only logs it. Net effect: the entire multi-source sync (including ADEME) silently fails and the catalog stays at ~266 rows, with only a log line. The `dist/data/epa-vehicles.snapshot.csv` is present today (verified), but the failure mode is silent and total.
**Fix:** In `load()`, check `fs.existsSync(this.snapshotPath)` and throw a clear, actionable error, or catch ENOENT and log a warning + return `[]` so ADEME still ingests. Prefer failing the EPA half without sinking the ADEME half.

### WR-05: Snapshot allow-list duplicated across builder and adapter, flagged "keep in sync" but not enforced

**File:** `backend/src/scripts/build-epa-snapshot.ts:47-75` and `backend/src/vehicles/adapters/epa.adapter.ts:30-58`
**Issue:** `ALLOWLIST_MAKES` (builder) and `EPA_BRAND_ALLOWLIST` keys (adapter) are two hand-maintained lists of the same 27 makes; the builder comment says "Keep the two in sync." DRY violation — if someone adds a make to the adapter map but not the builder, the snapshot won't contain those rows and the change silently does nothing (and vice-versa).
**Fix:** Export `EPA_BRAND_ALLOWLIST` and derive the builder's `ALLOWLIST_MAKES` from `Object.keys(EPA_BRAND_ALLOWLIST)` so there is a single source of truth. (The builder is a dev CLI; importing from the adapter is fine.)

### WR-06: `findCatalogBrands` `COUNT(*)` cast assumes string but Postgres/SQLite differ; `getRawMany` typing is loose

**File:** `backend/src/vehicles/vehicles.service.ts:61-72`
**Issue:** `addSelect('COUNT(*)', 'count')` then `Number(row.count)` — Postgres returns `count` as a string (bigint), SQLite as a number; `Number()` handles both, so this works. But the raw-row type annotation `Array<{ brand: string; count: string }>` is asserted, not validated, and `getRawMany` is untyped — a column-name typo would silently yield `NaN`. Minor robustness, not a correctness break today.
**Fix:** Keep `Number(...)` (correct), but consider `getRawMany<{ brand: string; count: string | number }>()` and guard `Number.isFinite` on the result to avoid silent `NaN` counts in the brand facet.

## Info

### IN-01: `syncFromAdeme` is now a misnomer (runs multi-source ADEME+EPA)

**File:** `backend/src/vehicles/vehicle-sync.service.ts:136` and `vehicles.controller.ts:54-59` ("Manually triggers an ADEME catalog sync")
**Issue:** The method and the controller doc still say "ADEME" though they run the full multi-source merge. The code comment acknowledges the name was kept to avoid touching the route. Misleading for maintainers.
**Fix:** Rename to `syncCatalog()`/`syncAllSources()` with a deprecated alias, or at least update the controller JSDoc to say "multi-source (ADEME + EPA)".

### IN-02: `SyncResult.skipped = merged.length - created` mislabels EPA-on-conflict no-ops as ADEME refreshes

**File:** `backend/src/vehicles/vehicle-sync.service.ts:201-207`
**Issue:** `created = after - before` counts net new rows; on a re-run, ADEME `orUpdate` refreshes existing rows (count unchanged) and EPA `orIgnore` no-ops, so `created` can be 0 and `skipped` = total even though ADEME rows were updated. The metric conflates "updated" with "skipped". Logging only; no behavioral impact.
**Fix:** Track updated/inserted/ignored separately if the numbers matter operationally, or rename `skipped` to `unchangedOrUpdated`.

### IN-03: `STARTUP_THRESHOLD = 500` is a heuristic that can re-trigger a full network sync

**File:** `backend/src/vehicles/vehicle-sync.service.ts:38, 111-127`
**Issue:** If a future prune drops the catalog below 500 (or the first multi-source run is interrupted before reaching 500), the next boot re-launches a full ADEME-network + EPA sync in the background. Acceptable for v1 and documented, but the threshold is a magic number tied to expected row counts.
**Fix:** None required; consider a `catalog_synced_at` marker row instead of a count threshold if re-sync churn becomes an issue.

### IN-04: Showroom brand grouping operates only over the accumulated page subset

**File:** `web/src/app/app/garage/add/page.tsx:124-133, 280-297`
**Issue:** The brand jump-list and per-brand counts reflect only the currently loaded pages, not the full result set — a `/catalog/brands` facet endpoint exists (`vehicles.controller.ts:39-42`) but the showroom does not use it. So a brand with models only on page 3 won't appear in the jump-list until "Charger plus" loads it, and counts read low. Matches RESEARCH's "group the current accumulated items" note (intended), so this is informational.
**Fix:** Optional — drive the brand directory from `GET /vehicles/catalog/brands` for accurate full-set counts/jump-list while keeping paginated item loading.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | CR-01 (migration FK-RESTRICT crash on auto-run), CR-02 (irreversible `down()`), CR-03 (corrupted snapshot mega-row → garbage row) |
| Warning  | 6 | WR-01 (EPA brand normalize bypass), WR-02 (arbitrary oldest-year winner), WR-03 (FFV/E85→SP95 + dead `isE85`), WR-04 (missing snapshot → silent total sync failure), WR-05 (duplicated allow-list), WR-06 (loose brand-count typing) |
| Info     | 4 | IN-01 (misnomer `syncFromAdeme`), IN-02 (skipped metric), IN-03 (threshold heuristic), IN-04 (page-subset brand grouping) |

**Verified correct (no finding):** conversion constants/exactness (`conversions.ts`); EV uses `combE` not `comb08`; ≤0 → null no-fabrication guards; merge first-writer-wins + ADEME precedence + idempotency (`catalog-merge.spec.ts` proves it); `ON CONFLICT` target `(brand,model,fuel_type)` matches the UNIQUE index; ADEME `orUpdate` / EPA `orIgnore` split is correct for PD4-1; search params bound via `:s`/`:brand`/`:fuelType` (no SQL injection); GIN index expression `lower(brand || ' ' || model)` matches the query's `LOWER(vm.brand || ' ' || vm.model)`; `limit` capped at 100; showroom is server-side with a correct cancellable pagination effect (`cancelled` flag prevents stale appends) and the add-vehicle submit path is preserved.

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
