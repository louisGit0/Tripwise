# Requirements — verygoodtrip

**Milestone:** Precise tolls + editorial premium redesign (web + mobile)
**Defined:** 2026-05-29

All requirements below are v1 for *this milestone* (hypotheses until shipped). Existing
shipped capabilities are tracked as Validated in `.planning/PROJECT.md`.

---

## v1 Requirements

### Tolls (TOLL)

- [ ] **TOLL-01**: User sees a **precise** toll cost for a calculated trip via TollGuru when an API key is configured (real cost, not an estimate)
- [ ] **TOLL-02**: When TollGuru is unavailable, over quota, or unconfigured, the toll cost **falls back to the heuristic estimate** and the user clearly sees it is an estimate (badge/label)
- [ ] **TOLL-03**: Toll cost is computed for a **passenger car (class 1)** by default
- [ ] **TOLL-04**: Toll cost is **broken out clearly** in the trip result and included in the displayed total (separate line, real-vs-estimate indicator)
- [ ] **TOLL-05**: Toll cost is persisted on saved trips and reflected in history/stats totals
- [ ] **TOLL-06**: TollGuru calls are **cached and rate-safe** server-side (avoid burning quota on repeated identical routes) and the key is never exposed client-side

### Design System (DES)

- [ ] **DES-01**: A documented **"editorial premium dark"** design language exists — typography scale, color, spacing rhythm, surfaces, data-viz primitives — as reusable tokens
- [ ] **DES-02**: Cost / consumption / toll figures are presented as **designed data-viz** (hero number + breakdown), not plain text rows
- [ ] **DES-03**: Components have **designed interaction states** (hover / focus / press) and **loading skeletons**
- [ ] **DES-04**: Key results use **smooth, compositor-friendly micro-interactions** (animated cost counters, transitions) within performance budgets

### Web Redesign (WEB)

- [ ] **WEB-01**: All web screens (landing, dashboard, trip result, garage, showroom, trips/history, favorites, fuel-prices, settings, auth) are **restyled in the editorial dark direction** with existing flows preserved
- [ ] **WEB-02**: The **trip result** page is redesigned around the total cost + energy/toll breakdown + multi-energy comparison
- [ ] **WEB-03**: The **dashboard** (calc entry + KPIs) is redesigned in the new language
- [ ] **WEB-04**: Redesign meets Core Web Vitals targets (no layout shift, animations on transform/opacity only)

### Mobile Redesign (MOB)

- [ ] **MOB-01**: Mobile screens (auth, dashboard, garage, favorites, settings) are **restyled to match** the editorial dark direction using RN StyleSheet tokens
- [ ] **MOB-02**: Mobile **trip results show precise tolls** consistent with web (real-vs-estimate)
- [ ] **MOB-03**: Design tokens are **kept consistent** between web and mobile (shared source of truth where practical)

### Vehicle Catalog (CAT)

- [ ] **CAT-01**: Catalog ingests vehicles from **multiple real-consumption sources** (ADEME FR + EPA US fuel economy, source set extensible) — never fabricated/defaulted consumption
- [ ] **CAT-02**: Source records are **normalized** to canonical brand / model / fuel / consumption with units converted (e.g. US MPG → L/100km, Wh/km → kWh/100km) and a **source/provenance** field recorded
- [ ] **CAT-03**: Records are **deduplicated and merged** across sources into canonical `brand|model|fuel` entries (no cross-source duplicates)
- [ ] **CAT-04**: Catalog coverage is **substantially expanded** vs the ~266 ADEME-only baseline (target: thousands of real-consumption models — "nearly all common models")
- [ ] **CAT-05**: Ingestion is **idempotent and re-runnable** (sync command/script) without creating duplicates, like the existing ADEME sync
- [ ] **CAT-06**: The garage showroom **scales** to the larger catalog — server-side search + pagination (no client load-all), brand grouping preserved, fast on **web and mobile**

---

## Deferred (v2+)

- Multi-class tolls (trucks, motorcycles, towing) — class 1 only for now
- Per-segment toll breakdown (barrier-by-barrier list) — single total for now
- Avoid-tolls routing alternative — display only for now
- Light theme as a premium first-class experience — dark-first this milestone
- i18n FR/EN re-enable

## Out of Scope

- Mappy / ViaMichelin toll providers — TollGuru chosen
- Glassmorphism / bento / light-first visual directions — editorial dark chosen
- Heavy scroll/page animation & scrollytelling — measured micro-interactions chosen
- Geolocated auto-history, multi-currency, vehicle comparator, carpooling — later milestones
- Brand rename of repo / Render URL / `@tripwise/shared` package — separate chore

---

## Traceability

<!-- REQ-ID → Phase mapping (roadmapper) -->

| REQ-ID | Phase |
|--------|-------|
| TOLL-01 | Phase 1 |
| TOLL-02 | Phase 1 |
| TOLL-03 | Phase 1 |
| TOLL-04 | Phase 1 |
| TOLL-05 | Phase 1 |
| TOLL-06 | Phase 1 |
| DES-01 | Phase 2 |
| DES-02 | Phase 2 |
| DES-03 | Phase 2 |
| DES-04 | Phase 2 |
| WEB-02 | Phase 2 |
| WEB-01 | Phase 3 |
| WEB-03 | Phase 3 |
| WEB-04 | Phase 3 |
| CAT-01 | Phase 4 |
| CAT-02 | Phase 4 |
| CAT-03 | Phase 4 |
| CAT-04 | Phase 4 |
| CAT-05 | Phase 4 |
| CAT-06 | Phase 4 |
| MOB-01 | Phase 5 |
| MOB-02 | Phase 5 |
| MOB-03 | Phase 5 |
