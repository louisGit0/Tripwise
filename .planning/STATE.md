# Project State — verygoodtrip

## Project Reference

- **Core value:** Give an accurate, trustworthy total trip cost (energy + tolls) for a specific vehicle, instantly.
- **Milestone:** Precise tolls + editorial premium redesign + multi-source vehicle catalog (web + mobile)
- **Mode:** Vertical MVP
- **Current focus:** Phase 1 — Precise Tolls End-to-End (Web)

## Current Position

- **Phase:** 1 of 5 — Precise Tolls End-to-End (Web)
- **Plan:** None yet (awaiting `/gsd:plan-phase 1`)
- **Status:** Roadmap revised (catalog phase added), not started
- **Progress:** [░░░░░░░░░░] 0/5 phases complete

## Roadmap Snapshot

| Phase | Goal | Requirements | UI |
|-------|------|--------------|----|
| 1. Precise Tolls End-to-End (Web) | Trustworthy real/estimate tolls, broken out + persisted on web | TOLL-01..06 | - |
| 2. Editorial Dark DS + Trip Result | Documented editorial-dark tokens + data-viz, proven on trip result | DES-01..04, WEB-02 | yes |
| 3. Web Redesign Rollout | Editorial language across all remaining web screens, CWV preserved | WEB-01, WEB-03, WEB-04 | yes |
| 4. Multi-Source Vehicle Catalog + Scaled Showroom | Multi-source real-consumption catalog (thousands), normalized/deduped, server-side searched showroom | CAT-01..06 | yes |
| 5. Mobile Tolls + Editorial Redesign | Tolls + editorial language + server-side catalog browse on Expo via shared tokens | MOB-01..03 | yes |

## Performance Metrics

- Phases complete: 0/5
- Requirements mapped: 23/23
- Plans executed: 0

## Accumulated Context

### Key Decisions
- Precise tolls via TollGuru (live) — only practical origin→destination toll API; partial branch already in `backend/src/trips/trips.service.ts`.
- Editorial premium dark direction — evolves existing Carbon identity (Linear/Vercel vibe).
- Preserve architecture, redesign visual layer only — lower risk, keeps working flows intact.
- Measured micro-interactions over heavy animation — best impact/effort, safest for performance.
- Apply redesign to web AND mobile for cross-platform consistency.
- Multi-source catalog (ADEME + EPA, extensible) placed AFTER web redesign rollout so the showroom is scaled in its final editorial design, not reworked; placed BEFORE mobile so mobile inherits both the redesign and the server-side catalog search.
- Consumption must stay real (source-attributed, no fabricated defaults) to protect the Core Value of accurate cost.

### Todos / Watchpoints
- TollGuru must degrade gracefully to heuristic when key absent or over quota (free tier ~500 req/month).
- TollGuru key is server-side only — never in any client response or bundle.
- Web token must be cached server-side to avoid burning quota on repeated routes.
- `TripsService` is 726 lines — Phase 1 is a natural moment to extract a `TollService`.
- Existing single-source pipeline: `backend/src/vehicles/vehicle-sync.service.ts` + import script `backend/src/scripts/import-ademe.ts` (~266 deduped ADEME entries) — Phase 4 generalizes this into a multi-source, idempotent ingestion with provenance + cross-source merge.
- Showroom `web/src/app/app/garage/add/page.tsx` currently loads ALL models client-side — will not scale; Phase 4 moves it to server-side search + pagination and exposes an API the mobile phase reuses.
- CAT-06 spans web + mobile server-side search; it is owned by Phase 4 (builds the API + web showroom). Phase 5 consumes that API for the mobile showroom (no client load-all).
- Mobile has ~7 pre-existing TS errors unrelated to this work; do not let Phase 5 inherit blame for them.
- Mobile design tokens must work in RN StyleSheet (no Tailwind); web uses `bg-carbon-*` Tailwind utilities.
- `master` auto-deploys (Render + Vercel) — commit + push after each verified update.

### Blockers
- None.

## Session Continuity

- **Last action:** Roadmap revised — Phase 4 "Multi-Source Vehicle Catalog + Scaled Showroom" added (CAT-01..06); mobile shifted to Phase 5 with a new dependency on Phase 4. Traceability and state refreshed.
- **Next action:** `/gsd:plan-phase 1` to decompose Precise Tolls End-to-End (Web).
- **Updated:** 2026-05-29
