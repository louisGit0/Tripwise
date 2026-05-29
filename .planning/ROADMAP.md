# Roadmap — verygoodtrip

**Milestone:** Precise tolls + editorial premium redesign + multi-source vehicle catalog (web + mobile)
**Mode:** Vertical MVP (each phase ships an end-to-end, user-observable slice)
**Granularity:** standard
**Created:** 2026-05-29

This is a brownfield milestone on a mature, deployed app. The roadmap upgrades three
things on top of working flows: (1) toll **accuracy + presentation**, (2) a new
**editorial premium dark** visual layer rolled across web then mobile, and (3) a
**multi-source vehicle catalog** that expands the ADEME-only baseline (~266 entries) to
thousands of real-consumption models with a scaled, server-side showroom. Existing
architecture, routes, and data flows are preserved — we evolve the surface and the data
breadth, not the foundation.

## Phases

- [ ] **Phase 1: Precise Tolls End-to-End (Web)** - Live TollGuru tolls with graceful heuristic fallback, broken out and persisted, shown clearly on web trip results.
- [ ] **Phase 2: Editorial Dark Design System + Trip Result Redesign** - Documented editorial-dark token system + designed data-viz, proven on the highest-value screen (trip result).
- [ ] **Phase 3: Web Redesign Rollout** - The editorial language applied consistently across all remaining web screens, within performance budgets.
- [ ] **Phase 4: Multi-Source Vehicle Catalog + Scaled Showroom** - Catalog fed from multiple real-consumption sources (ADEME + EPA, extensible), normalized/deduped/merged into thousands of canonical models, with a server-side searched/paginated showroom.
- [ ] **Phase 5: Mobile Tolls + Editorial Redesign** - Precise tolls, the editorial-dark language, and the scaled server-side catalog brought to the Expo app with shared tokens.

## Phase Details

### Phase 1: Precise Tolls End-to-End (Web)
**Goal**: A user calculating a trip on the web sees a trustworthy toll cost — real when TollGuru is configured, a clearly-labelled estimate otherwise — broken out in the result and rolled into the displayed total and saved history.
**Mode:** mvp
**Depends on**: Nothing (builds on existing partial toll branch)
**Requirements**: TOLL-01, TOLL-02, TOLL-03, TOLL-04, TOLL-05, TOLL-06
**Success Criteria** (what must be TRUE):
  1. With a TollGuru key configured, a calculated French motorway trip shows a real toll cost flagged as precise (not an estimate).
  2. With no key, over quota, or on a TollGuru failure, the toll falls back to the heuristic and the user sees a clear "estimate" badge/label.
  3. The toll is computed for a passenger car (class 1) by default and shown as its own line, included in the displayed grand total.
  4. Saving a trip persists the toll cost so it appears in the trip detail, history, and monthly stats totals.
  5. Repeating an identical route does not issue a second TollGuru call (server-side cache), and the API key never appears in any client response or bundle.
**Plans**: 4 plans
Plans:
- [ ] 01-01-PLAN.md — Backend toll engine: extract TollService, precise TollGuru polyline call, defensive parse, 30-day cache, silent fallback, wire into TripsService (Wave 1)
- [ ] 01-02-PLAN.md — Persistence: tollIsEstimate entity column + hand-written migration (run dev) + save-flow + crud e2e (Wave 2)
- [ ] 01-03-PLAN.md — Web display: Tooltip atom, réel/≈ estimé badge, hide-when-0 on result, same badge on saved detail (Wave 3)
- [ ] 01-04-PLAN.md — Verification: live TollGuru Paris→Lyon checkpoint + web badge/tooltip visual checkpoint (Wave 4)

### Phase 2: Editorial Dark Design System + Trip Result Redesign
**Goal**: A reusable editorial-premium-dark design language exists as documented tokens, and the highest-value screen — the trip result — is rebuilt around it with designed cost/energy/toll data-viz and micro-interactions, proving the system before rollout.
**Mode:** mvp
**Depends on**: Phase 1 (toll breakout data drives the result data-viz)
**Requirements**: DES-01, DES-02, DES-03, DES-04, WEB-02
**Success Criteria** (what must be TRUE):
  1. A documented design language (typography scale, color, spacing rhythm, surfaces, data-viz primitives) exists as reusable tokens/components a developer can apply to any screen.
  2. The trip result page presents total cost as a designed hero figure with a clear energy + toll breakdown and multi-energy comparison — not plain text rows.
  3. Interactive elements on the result page show designed hover/focus/press states and loading skeletons while data resolves.
  4. The total cost animates with a smooth, compositor-friendly counter/transition that stays within performance budget (no jank, transform/opacity only).
**Plans**: TBD
**UI hint**: yes

### Phase 3: Web Redesign Rollout
**Goal**: Every remaining web screen wears the editorial-dark language consistently, with existing flows intact and Core Web Vitals preserved, so the whole web app feels like one premium product.
**Mode:** mvp
**Depends on**: Phase 2 (consumes the established design system)
**Requirements**: WEB-01, WEB-03, WEB-04
**Success Criteria** (what must be TRUE):
  1. Landing, dashboard, garage, showroom, trips/history, favorites, fuel-prices, settings, and auth screens are all restyled in the editorial-dark direction with their existing flows preserved.
  2. The dashboard (calc entry + KPIs) is redesigned in the new language with the same calculation behavior.
  3. Navigating between any two restyled screens feels visually consistent — shared surfaces, typography, and interaction states.
  4. Restyled pages meet Core Web Vitals targets: no new layout shift, and animations run on transform/opacity only.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Multi-Source Vehicle Catalog + Scaled Showroom
**Goal**: A user adding a vehicle can find nearly any common model — the catalog is fed from multiple real-consumption sources (ADEME + EPA, extensible), normalized/deduped/merged into thousands of canonical `brand|model|fuel` entries, every entry carries a real source-attributed consumption (no fabricated defaults), and the now-redesigned showroom searches it server-side so it stays fast at scale on web (and exposes the same API mobile will consume).
**Mode:** mvp
**Depends on**: Phase 3 (the showroom is already restyled in editorial-dark — Phase 4 scales it in its final design rather than reworking it later)
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06
**Success Criteria** (what must be TRUE):
  1. Adding a vehicle, a user can find a far broader set of common models than the ~266 ADEME baseline (thousands, multi-source) — every entry carries a real, source-attributed consumption, with no fabricated or defaulted values.
  2. Records from different sources for the same `brand|model|fuel` appear exactly once (deduped/merged), with consumption normalized to the app's canonical units (US MPG → L/100km, Wh/km → kWh/100km).
  3. The showroom loads and searches via server-side search + pagination (no client load-all), staying fast and brand-grouped even with thousands of models, via an API mobile can reuse.
  4. Re-running the catalog sync is idempotent — no duplicates created — like the existing ADEME sync, and a new source can be added to the pipeline without reworking normalization/dedup.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Mobile Tolls + Editorial Redesign
**Goal**: The Expo mobile app matches the web — precise tolls with real-vs-estimate indication on trip results, the editorial-dark language applied via shared design tokens, and a garage showroom that browses the scaled catalog through the same server-side search API instead of loading all models.
**Mode:** mvp
**Depends on**: Phase 1 (toll API + semantics), Phase 3 (settled design tokens to mirror), Phase 4 (server-side catalog search/pagination API for the mobile showroom)
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria** (what must be TRUE):
  1. Mobile auth, dashboard, garage, favorites, and settings screens are restyled to match the editorial-dark direction using RN StyleSheet tokens.
  2. A mobile trip result shows the precise toll cost with the same real-vs-estimate indicator as web.
  3. The mobile garage showroom browses the larger catalog via the Phase 4 server-side search + pagination API (no client load-all), staying fast and brand-grouped.
  4. Design tokens (color, typography, spacing) are kept consistent between web and mobile from a shared source of truth where practical.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Precise Tolls End-to-End (Web) | 0/4 | Planned | - |
| 2. Editorial Dark Design System + Trip Result Redesign | 0/0 | Not started | - |
| 3. Web Redesign Rollout | 0/0 | Not started | - |
| 4. Multi-Source Vehicle Catalog + Scaled Showroom | 0/0 | Not started | - |
| 5. Mobile Tolls + Editorial Redesign | 0/0 | Not started | - |
