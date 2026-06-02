# Phase 04 — Deferred Items

Out-of-scope discoveries logged during execution. Do NOT fix in the discovering plan.

## From plan 04-01 (schema foundation)

### DEF-04-01-01 — ADEME sync `doSync` must adopt ON CONFLICT (owned by 04-02/04-04)

- **Discovered during:** plan 04-01, Task 2 verification (vehicles e2e).
- **Symptom:** With the new `UQ_vehicle_models_canonical` unique constraint now
  live under SQLite `synchronize:true`, the background `onApplicationBootstrap`
  ADEME sync logs `Background ADEME sync failed` /
  `UNIQUE constraint failed: vehicle_models.brand, vehicle_models.model, vehicle_models.fuel_type`.
  The error is caught and logged (`void this.syncFromAdeme().catch(...)`), so it
  does NOT fail any test — the vehicles e2e is green (24/24).
- **Root cause:** `VehicleSyncService.doSync` (Step 5) bulk-inserts via
  `repo.save()` with no conflict handling. Before this plan there was no unique
  constraint so colliding rows inserted silently; the canonical index now
  rejects them. The collision is a startup race between the background sync and
  the e2e fixtures (Step 3's `existingSet` snapshot can predate a fixture insert).
- **Why deferred (NOT fixed in 04-01):** RESEARCH lines 288-303 + 326 scope the
  `doSync` → precedence-ordered `CatalogSourceAdapter` + batched
  `INSERT ... ON CONFLICT` (`orUpdate` for ADEME, `orIgnore` for EPA) refactor to
  plans 04-02 (adapters) / 04-04 (merge). `vehicle-sync.service.ts` is outside
  04-01's `files_modified`. Fixing it here would pre-empt the adapter design.
- **Production safety in the interim:** prod catalog is already populated
  (> `STARTUP_THRESHOLD = 500`), so the bootstrap sync SKIPS on normal deploys;
  the migration dedupes existing rows before creating the unique index. The
  collision only manifests on a fresh/empty DB running the sync.
- **Action for 04-02/04-04:** replace `repo.save(batch)` with a batched
  `createQueryBuilder().insert().orUpdate([...], ['brand','model','fuel_type'])`
  (ADEME) / `.orIgnore()` (EPA) keyed on the canonical triple, per RESEARCH.
  After that refactor the background sync log will be clean.
