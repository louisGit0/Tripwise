---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-06-02T07:23:00.000Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 17
  completed_plans: 11
  percent: 65
---

# Project State — verygoodtrip

## Project Reference

- **Core value:** Give an accurate, trustworthy total trip cost (energy + tolls) for a specific vehicle, instantly.
- **Milestone:** Precise tolls + editorial premium redesign + multi-source vehicle catalog (web + mobile)
- **Mode:** Vertical MVP
- **Current focus:** Phase 3 — web-redesign-rollout

## Current Position

Phase: 3 (web-redesign-rollout) — EXECUTING
Plan: 2 of 7

- **Phase:** 1 of 5 — Precise Tolls End-to-End (Web) — ✅ complete (estimate-primary)
- **Phase 01.1:** Route-aware free toll estimator — ✅ complete (1/1 plan)
- **Status:** Executing Phase 3
- **Progress:** [█████████░] 90%

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
- Plans executed: 9 (01-01 — backend toll engine, ~25min, 3 tasks, 5 files; 01-02 — toll-estimate persistence, ~15min, 3 tasks, 5 files; 01-03 — web toll display, ~12min, 3 tasks, 4 files; 01-04 — verification checkpoint, re-scoped D-07; 01.1-01 — route-aware free toll estimator, ~7min, 3 tasks, 6 files; 02-01 — editorial-dark token foundation, ~10min, 3 tasks, 3 files; 02-02 — motion hooks, ~4min, 2 tasks, 2 files; 02-03 — DataBar/Skeleton data-viz primitives, ~9min, 2 tasks, 2 files; 02-04 — trip result page editorial-dark redesign, ~13min, 2 tasks, 2 files; 03-01 — atom + AppLayout shell normalization (2-weight 400/700, canonical accent focus ring, accent-color fix), ~9min, 2 tasks, 14 files)

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
- **D-11 (2026-06-02) — serif display reverted (Phase 2 checkpoint):** The editorial serif display face (Instrument Serif) was implemented (02-01/02-04), reviewed live, and **dropped** — the user preferred the previous font. Titles/headings revert to **Space Grotesk bold (700)**; no serif family remains. The `--text-display` size token + the rest of Phase 2 (refined palette, 4-size/2-weight scale, DataBar, Skeleton, useCountUp/useReducedMotion, animated counter, motion) are kept. Editorial character comes from palette + scale + data-viz + motion, NOT a serif font. **Phase 3 must not reintroduce a serif display.** Commit `c585592`.
- **D-10 (2026-06-02) — disclaimer washes neutralized (plan 02-04):** The distance-mode + EV disclaimer notes on the result page were converted from `bg-amber-500/10`/`text-amber-400` to neutral `bg-carbon-surface2`/`text-carbon-ink2`/hairline. Reason: the editorial color contract reserves the energy palette (incl. amber `--c-fuel-die`) for data-viz + FuelBadge only, and the plan's verification grep forbids `bg-amber` in the file. Soft informational notes therefore use surface tokens, not a warning color. Applies to any future screen carrying inline disclaimer notes.
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
- ✅ Phase 2 (editorial dark DS + result redesign): tokens refined + Instrument Serif (400/700) + 4 type sizes (02-01); useReducedMotion/useCountUp (02-02); DataBar + Skeleton (02-03); result page redesigned — serif title, animated mono hero counter, breakdown + comparison DataBars, staggered reveal, skeleton, stepper a11y (02-04). Code review: CR-01 (invalid `<p>` in `<h2>`) + WR-01 (sr-only total) + WR-02 (FR hero comma) + WR-03 (eyebrow type) + WR-05 (total≤0 bar guard) FIXED (commit 7ec80d2). Build 18/18 green.
- ⏸️ Phase 2 deferred review items (Phase 3 / acceptable): WR-04 (hero counter re-counts 0→target on each passenger change — per-spec; tween-from-previous if it reads glitchy), WR-06 (reveal keyframe rests at opacity:0 — make resting state visible for robustness), IN-04/IN-05 (CTAButton font-medium/600 + per-instance useReducedMotion listeners → normalize when Phase 3 standardizes atoms).
- ⏳ Phase 2 visual checkpoint (02-05) pending USER visual verification on the deployed site (count-up, hide-when-toll-0, prefers-reduced-motion, light/dark parity, serif title). Phase not marked fully complete until confirmed.
- ✅ Phase 1.1 (D-08): route-aware FREE toll estimate shipped — `classifyTolledKm` sums Mapbox `steps[].ref` autoroute km minus `FREE_AUTOROUTES` × `NATIONAL_AVG_RATE_PER_KM` (0.09); Mapbox `getDirections` now requests `steps=true` and surfaces `RouteStep[]`; threaded into `computeTollCost` as an additive optional 4th arg (cache/never-throw/TollGuru branch untouched). `isEstimate` always true. Paris→Lyon ≈ €40.50.
- ℹ️ Phase 1.1 code review — 2 accepted/deferred warnings: WR-01 `getDirections` requests `steps=true` unconditionally so `calculateMulti` fetches a heavier payload it discards (negligible; revisit if Mapbox quota matters); WR-02 e2e mocks `TollService` (stubs use `steps:[]`) so the real classifier isn't driven through HTTP — mitigated by exhaustive unit coverage (toll 26/26 incl. anchor + ref variants) + the e2e 4th-arg wiring assertion. Add a real-classifier e2e if integration confidence ever needs raising.

### Blockers

- None.

## Session Continuity

- **Last action:** Phase 3 plan 03-01 complete — atom + AppLayout shell normalization (Wave 1 BLOCKING foundation; WEB-01/WEB-04). 2 atomic commits (`79b6d07` 13 `ui/` atoms → 2-weight 400/700 + CTAButton accent/surface/ghost focus ring `ring-blue-500/*`→`ring-carbon-accent/50` (accent-color fix #3b82f6→#4d8bff, danger keeps red) + Input/Select canonical `focus-visible` token replacing `focus:ring-offset-0`; `4cf06b4` AppLayout `+ Nouveau trajet` CTA `font-semibold`→`font-bold` (font-mono kept) + canonical focus ring on CTA/burger/collapse/drawer-close + `aria-label` on the icon-only-at-xs CTA, active SidebarItem `bg-blue-500/10 text-carbon-accent` tint kept). API-stable className-only (MD-2). Web `tsc` clean + `build` 18/18 green; grep gate: 0 `font-medium`/`font-semibold`/`font-extrabold`, 0 `ring-blue-500`, 0 `focus:ring-offset-0` across `ui/`+AppLayout. NO serif (D-11). IN-05 useReducedMotion provider hoist deferred (per-component hook works; out of MD-2 scope). Not yet pushed — orchestrator pushes after phase verification.
- **Phase 2 prior:** plan 02-04 complete — trip result page editorial-dark redesign (proof slice; DES-02/03/04 + WEB-02 now user-observable). 2 atomic commits (`9a0d217` hero region — serif `h1` title + `useCountUp` mono hero counter (aria-hidden + sr-only real value, tabular-nums fixed 2dp → no CLS) on `!bg-carbon-surface3` plate + Variant A `DataBar` Énergie/Péage breakdown with dotted legend (hide-when-toll-0, D-04) + metric tiles `reveal` stagger gated by `useReducedMotion`; new `reveal` keyframe in globals.css; `c28043c` comparison Variant B `DataBar` rows (energy/gpl CSS-var fills, current full-opacity + `← actuel` accent, others muted) replacing the deleted `categoryColor()` ad-hoc block + standardized `focus-visible:ring-carbon-accent/50` + stepper aria-labels (FLAG 1) + layout-mirroring `Skeleton`). All existing logic preserved (sessionStorage guard, `handleSave`/`/trips/save` payload, stepper math, multiResult, derivations) — MD-2. Web `tsc` clean + `build` 18/18 green (`/app/trips/result` 7.15 kB); grep gate passes (0 categoryColor/bg-emerald/sky/violet/amber/font-medium/font-semibold; DataBar/Skeleton/useCountUp/useReducedMotion/font-serif/aria-label/var(--c-toll) present). D-10: disclaimer washes neutralized to surface tokens. Not yet pushed — orchestrator pushes after phase verification.
- **Phase 2 prior:** plan 02-03 complete — DES-01/02/03 data-viz primitives. 3 atomic commits (1cc5c56 DataBar initial, e3faccb Skeleton, ac1e281 DataBar Variant A refactor). `web/src/components/ui/DataBar.tsx` — token-driven bar: Variant A segmented Énergie/Péage (energy segment passed `energyFillVar`, toll segment internal `var(--c-toll)`, hidden when `tollValue===0` → full-width energy bar, D-04), Variant B single comparison (width value/max, muted non-current at inline opacity 0.45); fills via inline CSS-var `style` only (no Tailwind palette classes); scaleX(0→1) 600ms cubic-bezier reveal via mounted-flag effect, gated by `useReducedMotion` (reduced → scaleX(1)/transition:none); `pct()` clamps 0–100 + guards zero/NaN totals; heights sm=h-1.5/md=h-2.5. `web/src/components/ui/Skeleton.tsx` — bg-carbon-surface2 block, opacity-based animate-pulse dropped under reduced motion, width/height number→px or string, rounded override, aria-hidden. Web `tsc` clean + `build` 18/18 green; plan grep gate passes (scaleX/var(--c-toll)/useReducedMotion present, no bg-emerald/sky/violet/amber). Not yet pushed — orchestrator pushes after phase verification.
- **Phase 2 prior:** plan 02-02 complete — DES-04 motion hooks. 2 atomic commits (92ed137 useReducedMotion, 538c3a9 useCountUp). `useReducedMotion.ts` SSR-safe matchMedia; `useCountUp.ts` rAF easeOutCubic 0→target 700ms with reduced-motion instant gate.
- **Phase 2 prior:** plan 02-01 complete — editorial-dark token foundation (DES-01). 3 atomic commits (794fe0e globals.css tokens, ab54acf tailwind utilities, 46978a6 layout font wiring). New tokens `--c-surface3`/`--c-fuel-gpl`/`--c-toll`, refined surface+neutral ramp (muted AA fix #8a8173), serif h1/h2; Instrument Serif via next/font (2 weights 400/700).
- **Phase 01.1 prior:** complete (plan 01.1-01) — route-aware free toll estimator behind unchanged `TollService` (D-09); 3 commits (d699031/f523620/70be240); full e2e 143/143 green.
- **Phase 01 prior:** complete + pushed to `master` (cfdb828); estimate-primary (D-07); precise TollGuru path built + dormant.
- **Watchpoint (Phase 3):** 72 `font-semibold`/`font-medium` usages across 30 web files still reference the now-unloaded 500/600 weights (deliberate per PD-2 2-weight system) — browser rounds to nearest loaded weight; Phase 3 migrates them to weight 700 emphasis or size hierarchy.
- **Next action:** Phase 3 Wave 1 (BLOCKING atoms+shell) DONE — screens can now inherit the normalized vocabulary. Execute Wave 2 screen clusters (parallel-safe, no shared-file overlap): 03-02 Cluster A (landing + auth), 03-03 Cluster B (dashboard data-viz), 03-04 Cluster C (garage + detail + showroom), 03-05 Cluster D (trips + detail + favorites), 03-06 Cluster E (fuel-prices + settings). Then 03-07 visual+CWV human-verify checkpoint (Wave 3). All apply: canonical focus token, 2-weight, Skeleton atom, Space Grotesk titles — NO serif (D-11).
- **Watchpoint (Phase 3 screens):** the normalized atoms now carry weight 700 / canonical focus; remaining per-screen `font-semibold`/`font-medium` usages in the page files (~30 files) still need migration in their cluster plans — atoms are no longer the source of the stale weights.
- **Updated:** 2026-06-02
