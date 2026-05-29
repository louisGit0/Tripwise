# Roadmap — verygoodtrip

**Milestone:** Precise tolls + editorial premium redesign (web + mobile)
**Mode:** Vertical MVP (each phase ships an end-to-end, user-observable slice)
**Granularity:** standard
**Created:** 2026-05-29

This is a brownfield milestone on a mature, deployed app. The roadmap upgrades two
things on top of working flows: (1) toll **accuracy + presentation**, and (2) a new
**editorial premium dark** visual layer rolled across web then mobile. Existing
architecture, routes, and data flows are preserved — we evolve the surface, not the
foundation.

## Phases

- [ ] **Phase 1: Precise Tolls End-to-End (Web)** - Live TollGuru tolls with graceful heuristic fallback, broken out and persisted, shown clearly on web trip results.
- [ ] **Phase 2: Editorial Dark Design System + Trip Result Redesign** - Documented editorial-dark token system + designed data-viz, proven on the highest-value screen (trip result).
- [ ] **Phase 3: Web Redesign Rollout** - The editorial language applied consistently across all remaining web screens, within performance budgets.
- [ ] **Phase 4: Mobile Tolls + Editorial Redesign** - Precise tolls and the editorial-dark language brought to the Expo app with shared tokens.

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
**Plans**: TBD

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

### Phase 4: Mobile Tolls + Editorial Redesign
**Goal**: The Expo mobile app matches the web — precise tolls with real-vs-estimate indication on trip results, and the editorial-dark language applied to its screens via shared design tokens.
**Mode:** mvp
**Depends on**: Phase 1 (toll API + semantics), Phase 3 (settled design tokens to mirror)
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria** (what must be TRUE):
  1. Mobile auth, dashboard, garage, favorites, and settings screens are restyled to match the editorial-dark direction using RN StyleSheet tokens.
  2. A mobile trip result shows the precise toll cost with the same real-vs-estimate indicator as web.
  3. Design tokens (color, typography, spacing) are kept consistent between web and mobile from a shared source of truth where practical.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Precise Tolls End-to-End (Web) | 0/0 | Not started | - |
| 2. Editorial Dark Design System + Trip Result Redesign | 0/0 | Not started | - |
| 3. Web Redesign Rollout | 0/0 | Not started | - |
| 4. Mobile Tolls + Editorial Redesign | 0/0 | Not started | - |
