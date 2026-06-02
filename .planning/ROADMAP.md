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

- [x] **Phase 1: Precise Tolls End-to-End (Web)** - Estimate-primary tolls (re-scoped D-07: TollGuru paid/no key), graceful heuristic fallback as the live mode, broken out and persisted, shown clearly on web trip results. Precise TollGuru path built + dormant pending a key.
- [x] **Phase 2: Editorial Dark Design System + Trip Result Redesign** - Documented editorial-dark token system + designed data-viz, proven on the highest-value screen (trip result). (completed 2026-06-02)
- [x] **Phase 3: Web Redesign Rollout** - The editorial language applied consistently across all remaining web screens, within performance budgets. (completed 2026-06-02)
- [x] **Phase 4: Multi-Source Vehicle Catalog + Scaled Showroom** - Catalog fed from multiple real-consumption sources (ADEME + EPA, extensible), normalized/deduped/merged into thousands of canonical models, with a server-side searched/paginated showroom. (completed 2026-06-02)
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
- [x] 01-01-PLAN.md — Backend toll engine: extract TollService, precise TollGuru polyline call, defensive parse, 30-day cache, silent fallback, wire into TripsService (Wave 1)
- [x] 01-02-PLAN.md — Persistence: tollIsEstimate entity column + hand-written migration (run dev) + save-flow + crud e2e (Wave 2)
- [x] 01-03-PLAN.md — Web display: Tooltip atom, réel/≈ estimé badge, hide-when-0 on result, same badge on saved detail (Wave 3)
- [x] 01-04-PLAN.md — Verification checkpoint **re-scoped (D-07)**: TollGuru paid/no key → estimate-primary adopted; estimate fallback + web visuals + persistence verified, precise live path (TOLL-01/03, Assumptions A1–A6) deferred to a gap-closure plan (Wave 4)

### Phase 01.1: Route-aware free toll estimator (INSERTED)

**Goal:** A user calculating a trip sees a toll estimate that scales with the tolled autoroute kilometres actually on their route (not a flat distance heuristic), computed entirely for free — no paid API, no credit card — behind the existing `TollService`. The value stays honestly labelled "≈ estimé". Replaces the crude `estimateFrenchTolls` flat heuristic (decision D-08, free alternative to the paid TollGuru path which stays dormant).
**Mode:** mvp
**Depends on**: Phase 1 (reuses `TollService.computeTollCost(coordinates,...)`, the 30-day cache, the never-throw contract, and the web "≈ estimé" badge — all unchanged)
**Requirements**: TOLL-02 (refined), TOLL-07
**Success Criteria** (what must be TRUE):
  1. A route using tolled autoroutes returns an estimate scaled by detected tolled km × a per-network average €/km (not the old flat value), with `isEstimate=true`.
  2. A route with no tolled autoroute returns 0 (no toll line shown).
  3. Paris→Lyon lands in a plausible ≈ €30–45 band.
  4. No paid dependency, no API key, no credit-card-gated service is added.
  5. All existing toll tests stay green; new unit tests cover tolled-km detection + per-network rate application + the no-autoroute=0 case.
**Plans**: 1 plan
**UI hint**: no

Plans:
- [x] 01.1-01-PLAN.md — Route-aware free toll estimator: RouteStep contract + failing route-aware spec (RED), classifier + FREE_AUTOROUTES + NATIONAL_AVG_RATE_PER_KM (GREEN), Mapbox steps=true + call-site threading + trips e2e (Wave 1)

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
**Plans**: 5 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — Token + font foundation: evolve globals.css surface/neutral ramp + new surface3/toll/gpl + 4 type-size vars + serif headings, map to Tailwind utilities + spacing aliases, wire Instrument Serif via next/font (Wave 1)
- [x] 02-02-PLAN.md — Motion hooks: useReducedMotion (SSR-safe gate) + useCountUp (700ms easeOutCubic rAF counter, reduced-motion-aware) (Wave 1)
- [x] 02-03-PLAN.md — Data-viz primitives: DataBar (Variant A segmented Énergie/Péage + Variant B single, scaleX reveal, token-driven) + Skeleton atom (Wave 2)
- [x] 02-04-PLAN.md — Trip result redesign: serif title + animated mono hero counter + segmented breakdown bar + comparison bars + interaction states + stepper a11y + layout-mirroring skeleton (Wave 3)
- [x] 02-05-PLAN.md — Visual + motion human-verify checkpoint (hero count-up, hide-when-toll-0, reduced-motion, theme parity) (Wave 4)

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
**Plans**: 7 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Atom normalization + AppLayout shell (Wave 1, BLOCKING): weights→400/700, canonical accent focus ring, accent-color fix, optional useReducedMotion provider
- [x] 03-02-PLAN.md — Cluster A: landing + auth (login/register/OAuth callbacks) restyle (Wave 2)
- [x] 03-03-PLAN.md — Cluster B: dashboard data-viz redesign (WEB-03) — hero calc plate + NumberDisplay/DataBar/Sparkline KPI band (Wave 2)
- [x] 03-04-PLAN.md — Cluster C: garage list + detail + showroom restyle (icon aria-labels; showroom restyle-only) (Wave 2)
- [x] 03-05-PLAN.md — Cluster D: trips history + trip detail (mirror result page) + favorites restyle (Wave 2)
- [x] 03-06-PLAN.md — Cluster E: fuel-prices + settings restyle (completes WEB-01) (Wave 2)
- [x] 03-07-PLAN.md — Visual + CWV human-verify checkpoint: repo-wide consistency gate + cross-screen sign-off (Wave 3)

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
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md — Schema foundation: source provenance column + canonical UNIQUE index (dedupe-before-index) + pg_trgm/brand/GIN search indexes (Wave 1)
- [x] 04-02-PLAN.md — Ingestion spine: CatalogSourceAdapter contract + verified conversions/EPA→FuelType map + AdemeAdapter + EpaAdapter + committed trimmed EPA snapshot (Wave 2)
- [x] 04-03-PLAN.md — Server-side catalog API: extend GET /vehicles/catalog (search/brand/fuelCategory/pagination) + /catalog/brands facet + e2e (Wave 2)
- [x] 04-04-PLAN.md — Merge orchestrator: ADEME-precedence first-writer-wins + ON CONFLICT upsert (idempotent, extensible) + merge unit spec (Wave 3)
- [x] 04-05-PLAN.md — Showroom rework: garage/add → debounced server-side search + pagination, Phase 3 visuals preserved (Wave 3)
- [x] 04-06-PLAN.md — Phase verification checkpoint: catalog grew to thousands, multi-source/real consumption, no dupes, server-side fast showroom (Wave 4)

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
**Plans**: 8 plans
**UI hint**: yes

Plans:
- [x] 05-01-PLAN.md — Foundation (Wave 1, BLOCKING): shared editorial-dark token module (shared/src/tokens.ts) + Metro/tsconfig wiring + rewrite mobile theme.ts to one ThemeColors shape (resolves 5 of 7 tsc errors)
- [x] 05-02-PLAN.md — Fonts + shared components (Wave 2): Space Grotesk/JetBrains Mono via @expo-google-fonts + normalize Button/Card/Input/Wordmark/Autocomplete/MapboxMap (fixes last 2 tsc errors) + toll/catalog types + i18n strings
- [x] 05-03-PLAN.md — RN data-viz/motion primitives (Wave 2): useReducedMotion (AccessibilityInfo) + AnimatedCounter + DataBar (Énergie/Péage) + Pill/SectionCard/Eyebrow
- [x] 05-04-PLAN.md — Auth + layouts restyle (Wave 3): login + register + auth/tab layouts editorial-dark (flows preserved)
- [ ] 05-05-PLAN.md — Dashboard + tolls (Wave 3): editorial-dark dashboard + hero AnimatedCounter + Énergie/Péage breakdown + réel/≈ estimé badge (MOB-02)
- [ ] 05-06-PLAN.md — Vehicles + catalog browse (Wave 3): editorial-dark garage + server-side paginated brand-grouped catalog (fix data.items, no client load-all)
- [ ] 05-07-PLAN.md — Favorites + settings restyle (Wave 3): editorial-dark, flows preserved
- [ ] 05-08-PLAN.md — Visual + tolls + catalog human-verify checkpoint (Wave 4): on-device sign-off (MOB-01/02/03)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Precise Tolls End-to-End (Web) | 4/4 | Complete (re-scoped: estimate-primary) | 2026-06-01 |
| 01.1. Route-aware free toll estimator | 1/1 | Complete | 2026-06-01 |
| 2. Editorial Dark Design System + Trip Result Redesign | 5/5 | Complete   | 2026-06-02 |
| 3. Web Redesign Rollout | 7/7 | Complete   | 2026-06-02 |
| 4. Multi-Source Vehicle Catalog + Scaled Showroom | 6/6 | Complete   | 2026-06-02 |
| 5. Mobile Tolls + Editorial Redesign | 4/8 | In Progress|  |
