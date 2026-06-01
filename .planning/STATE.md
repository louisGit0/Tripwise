---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-06-01T20:45:10Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
  percent: 33
---

# Project State — verygoodtrip

## Project Reference

- **Core value:** Give an accurate, trustworthy total trip cost (energy + tolls) for a specific vehicle, instantly.
- **Milestone:** Precise tolls + editorial premium redesign + multi-source vehicle catalog (web + mobile)
- **Mode:** Vertical MVP
- **Current focus:** Phase 01.1 — route-aware-free-toll-estimator

## Current Position

Phase: 01.1 (route-aware-free-toll-estimator) — ✅ COMPLETE
Plan: 1 of 1 done

- **Phase:** 1 of 5 — Precise Tolls End-to-End (Web) — ✅ complete (estimate-primary)
- **Phase 01.1:** Route-aware free toll estimator — ✅ complete (1/1 plan)
- **Status:** Phase 01.1 complete; ready to plan Phase 2
- **Progress:** [████████░░] phases 1 + 01.1 complete

## Roadmap Snapshot

| Phase | Goal | Requirements | UI |
|-------|------|--------------|----|
| 1. Precise Tolls End-to-End (Web) | Trustworthy real/estimate tolls, broken out + persisted on web | TOLL-01..06 | - |
| 2. Editorial Dark DS + Trip Result | Documented editorial-dark tokens + data-viz, proven on trip result | DES-01..04, WEB-02 | yes |
| 3. Web Redesign Rollout | Editorial language across all remaining web screens, CWV preserved | WEB-01, WEB-03, WEB-04 | yes |
| 4. Multi-Source Vehicle Catalog + Scaled Showroom | Multi-source real-consumption catalog (thousands), normalized/deduped, server-side searched showroom | CAT-01..06 | yes |
| 5. Mobile Tolls + Editorial Redesign | Tolls + editorial language + server-side catalog browse on Expo via shared tokens | MOB-01..03 | yes |

## Performance Metrics

- Phases complete: 1/5
- Requirements mapped: 23/23
- Plans executed: 5 (01-01 — backend toll engine, ~25min, 3 tasks, 5 files; 01-02 — toll-estimate persistence, ~15min, 3 tasks, 5 files; 01-03 — web toll display, ~12min, 3 tasks, 4 files; 01-04 — verification checkpoint, re-scoped D-07; 01.1-01 — route-aware free toll estimator, ~7min, 3 tasks, 6 files)

## Accumulated Context

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: Route-aware free toll estimator (D-08 — free alternative to paid TollGuru) (URGENT)

### Key Decisions

- Precise tolls via TollGuru (live) — only practical origin→destination toll API; partial branch already in `backend/src/trips/trips.service.ts`.
- Editorial premium dark direction — evolves existing Carbon identity (Linear/Vercel vibe).
- Preserve architecture, redesign visual layer only — lower risk, keeps working flows intact.
- Measured micro-interactions over heavy animation — best impact/effort, safest for performance.
- Apply redesign to web AND mobile for cross-platform consistency.
- Multi-source catalog (ADEME + EPA, extensible) placed AFTER web redesign rollout so the showroom is scaled in its final editorial design, not reworked; placed BEFORE mobile so mobile inherits both the redesign and the server-side catalog search.
- Consumption must stay real (source-attributed, no fabricated defaults) to protect the Core Value of accurate cost.
- **D-07 (2026-06-01) — estimate-primary re-scope:** TollGuru is paid and a key cannot be obtained. The heuristic French-toll **estimate is adopted as the primary production mode**. The precise TollGuru code path stays built and dormant; it activates automatically if a `TOLLGURU_API_KEY` is ever configured. TOLL-01 (precise live) and TOLL-03 (class-1 live) are **deferred** to a future gap-closure plan.
- **D-09 (2026-06-01) — route-aware estimator shipped (Phase 01.1):** The flat speed-fraction heuristic is replaced by a route-aware estimate — `classifyTolledKm(steps)` sums Mapbox `steps[].ref` autoroute km minus a `FREE_AUTOROUTES` set, × `NATIONAL_AVG_RATE_PER_KM = 0.09`. National average only (no per-operator overrides — `ref` yields the A-number, not the operator; YAGNI). Added via an **additive optional `steps?` 4th arg** on `computeTollCost` (cache + never-throw + dormant TollGuru branch untouched, LD-2). Mapbox `getDirections` now requests `steps=true`; `TripsService` threads `directions.steps`. Speed heuristic retained as the no-steps fallback. Always `isEstimate: true`; no UI/schema change (LD-6/LD-7). Paris→Lyon → €40.50 (in €30–45 band).
- **D-08 (2026-06-01) — free route-aware toll estimator (chosen alternative to TollGuru):** Research confirmed no permanently-free precise toll API for FR without a card (TollGuru = 14-day trial then $80+/mo; Google Routes = card + paid SKU beyond cap; FR open data has toll GATES but no tariff grid). Decision: **improve the estimate** to be route-aware — detect tolled autoroute km on the route and apply a per-network average €/km — fully free, no card, behind the same provider-agnostic `TollService.computeTollCost(coordinates,...)` interface. Stays labelled "≈ estimé". Likely implementation: Mapbox Directions `steps=true` road `ref` (A-roads) minus a free-autoroute exclusion list × per-operator €/km (Vinci/APRR/Sanef ~0.08–0.11 €/km); Overpass `toll=yes` is the fallback technique. Precise providers (Google Routes / open-data tariff engine) remain a later option behind the same interface.

### Todos / Watchpoints

- TollGuru must degrade gracefully to heuristic when key absent or over quota (free tier ~500 req/month).
- TollGuru key is server-side only — never in any client response or bundle.
- Web token must be cached server-side to avoid burning quota on repeated routes.
- ✅ `TollService` extracted from `TripsService` (plan 01-01): precise TollGuru polyline call, defensive parse, 30-day SHA-1 cache, silent heuristic fallback; wired via `Promise.all`. `computeTollCost`/`estimateFrenchTolls` removed from `TripsService`.
- ⚠️ Precise TollGuru branch is unit-tested with a mocked `fetch` only — endpoint/response-shape/precision (RESEARCH A1–A6) remain **unverified against the real API** and are now **deferred indefinitely** (no paid key, D-07). Re-open as a gap-closure plan the day a key is obtained: set key → Paris→Lyon → expect `tollIsEstimate=false` ≈ €35–40 + cache-hit + green "réel" badge.
- ✅ `Trip.tollIsEstimate` persisted (plan 01-02): `toll_is_estimate` boolean column + hand-written migration `1748000000000` (applied dev, `[X] 5`); `SaveTripDto.tollIsEstimate` (optional `@IsBoolean`); `saveTrip` writes `?? false`; crud e2e proves round-trip via `GET /trips/:id` and stats-once. Plan 01-03 renders the badge on the detail page.
- ℹ️ Global `ValidationPipe` uses `enableImplicitConversion: true` — coerces strings to booleans before `@IsBoolean` runs, so a malformed boolean is silently truthy-coerced (not 400). Project-wide; relevant if any future negative DTO test targets a boolean field.
- Existing single-source pipeline: `backend/src/vehicles/vehicle-sync.service.ts` + import script `backend/src/scripts/import-ademe.ts` (~266 deduped ADEME entries) — Phase 4 generalizes this into a multi-source, idempotent ingestion with provenance + cross-source merge.
- Showroom `web/src/app/app/garage/add/page.tsx` currently loads ALL models client-side — will not scale; Phase 4 moves it to server-side search + pagination and exposes an API the mobile phase reuses.
- CAT-06 spans web + mobile server-side search; it is owned by Phase 4 (builds the API + web showroom). Phase 5 consumes that API for the mobile showroom (no client load-all).
- Mobile has ~7 pre-existing TS errors unrelated to this work; do not let Phase 5 inherit blame for them.
- Mobile design tokens must work in RN StyleSheet (no Tailwind); web uses `bg-carbon-*` Tailwind utilities.
- `master` auto-deploys (Render + Vercel) — commit + push after each verified update.

### Blockers

- None.

## Session Continuity

- **Last action:** Phase 01.1 complete (plan 01.1-01) — route-aware free toll estimator shipped behind the unchanged `TollService` (D-09). 3 atomic commits (d699031 RED, f523620 GREEN, 70be240 wire). Backend `tsc`/`nest build` clean; toll unit 26/26, trips e2e 66/66, full unit 46/46, full e2e 143/143 green. Not yet pushed — orchestrator pushes after phase verification.
- **Phase 01 prior:** complete + pushed to `master` (cfdb828); estimate-primary (D-07); precise TollGuru path built + dormant (auto-activates on key). `migrationsRun: isProd` applies the `1748000000000` toll migration on prod boot.
- **Next action:** `/gsd:verify-work` on Phase 01.1, then `/gsd:plan-phase 2` — Editorial Dark Design System + Trip Result Redesign (DES-01..04, WEB-02). Re-open precise tolls (TOLL-01/03) as a gap-closure plan only if a TollGuru key is ever obtained.
- **Updated:** 2026-06-01
