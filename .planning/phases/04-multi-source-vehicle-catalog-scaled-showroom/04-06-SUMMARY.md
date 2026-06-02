---
phase: 04-multi-source-vehicle-catalog-scaled-showroom
plan: 06
subsystem: verification / catalog + showroom checkpoint
tags: [catalog, multi-source, epa, ademe, showroom, checkpoint, human-verify]
outcome: passed
checkpoint:
  type: human-verify
  result: approved
key-files:
  created: []
  modified: []
metrics:
  completed: 2026-06-02
  tasks: 2
---

# Plan 04-06 — Catalog + Showroom Checkpoint Outcome

## Result: APPROVED

User verified on the deployed site after the auto-migration + one-time multi-source sync:
catalog grew from ~266 ADEME-only to thousands of multi-source canonical models, the showroom
searches server-side (debounced, paginated, brand-grouped), no obvious duplicates, real
source-attributed consumption. ("Approved".)

## Automated gate (Task 1) — passed before the human checkpoint

- **Code review (04-REVIEW.md):** 3 Critical + 6 Warning + 4 Info. **All 3 Criticals fixed** (commit
  7996a03): CR-01 FK-safe dedupe (repoint `user_vehicles` to keeper before delete — no FK-RESTRICT
  crash-loop on the auto-run prod migration), CR-02 honest non-reversible `down()`, CR-03 corrupted
  EPA snapshot + parser EOF/quote bug fixed and snapshot regenerated clean (29,113 rows, uniform
  9-col, no mega-row). WR-01 (EPA brand normalize), WR-02 (keep newest year), WR-04 (adapter-failure
  isolation: EPA failure no longer sinks ADEME) also fixed. Rest deferred.
- **Build/tests:** backend `tsc` + `nest build` clean; adapter unit specs 26/26; full e2e 150/150.
- Verified-correct in review (no change needed): exact conversions (235.214583/MPG, combE/1.609344,
  EV reads combE not MPGe), no fabricated consumption (≤0 → skip), ADEME-precedence first-writer-wins
  merge + idempotent ON CONFLICT, parameterized search (no SQL injection), GIN index expression
  matching the query, bounded pagination, cancellable showroom pagination.

## Requirements (CAT-01..06 — all delivered)

- CAT-01 multi-source real-consumption ingestion (ADEME + EPA, extensible adapter interface).
- CAT-02 normalization + unit conversion + provenance (`source`).
- CAT-03 dedup/merge into canonical `brand|model|fuel` (UNIQUE + ON CONFLICT).
- CAT-04 coverage expanded ~266 → thousands.
- CAT-05 idempotent + extensible (re-run = identical set; a 3rd source drops in via the adapter).
- CAT-06 server-side searched/paginated showroom (no client load-all), brand-grouped, mobile-reusable API.

## Architecture notes for Phase 5 (mobile)

- The mobile showroom reuses `GET /vehicles/catalog` (search, brand, fuelType/fuelCategory, page,
  limit → `{items,total,page,limit,totalPages}`) + `GET /vehicles/catalog/brands`.
- Sync is one-time on boot (STARTUP_THRESHOLD); manual `POST /vehicles/sync` refreshes.

## Deferred (non-blocking)

WR-03, WR-05, WR-06, IN-01..04 from 04-REVIEW (e.g. allow-list duplication builder/adapter,
minor robustness). Pre-existing MapboxMap setHTML XSS (from Phase 3) still open. STARTUP_THRESHOLD
behavior documented (one-time auto-sync; manual endpoint for refresh).

## Outcome

Multi-source catalog + scaled showroom live and verified. **Phase 4 complete.** Next + final:
Phase 5 — Mobile Tolls + Editorial Redesign (consumes this catalog API + the toll semantics + the
editorial-dark tokens mirrored in RN StyleSheet).
