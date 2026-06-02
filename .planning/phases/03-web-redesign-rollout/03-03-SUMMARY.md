---
phase: 03-web-redesign-rollout
plan: 03
subsystem: web-ui
tags: [editorial-dark, dashboard, data-viz, count-up, segmented-control, skeleton, reveal, restyle]
requires:
  - "Normalized ui/ atoms from 03-01 (SegmentedControl/NumberDisplay/KPICell/Select/CTAButton/Eyebrow — 2-weight 400/700 + canonical accent focus)"
  - "Phase 2 primitives: DataBar (Variant A/B), Skeleton, Sparkline, useCountUp, useReducedMotion + the reveal keyframe in globals.css"
provides:
  - "Editorial-dark data-viz dashboard /app/dashboard: editorial header, hero calc plate, designed KPI band, CLS-safe skeletons, staggered reveal"
  - "Hero calc plate on bg-carbon-surface3 with SegmentedControl mode toggle + animated mono result figure (useCountUp, aria-hidden + sr-only)"
  - "KPI band as NumberDisplay mono figures + DataBar micro-viz + retained Sparkline; KPICell delta for savedVsGas %"
affects:
  - "Cluster B of Phase 3 rollout complete; remaining clusters (C garage / D trips / E fuel+settings) are independent page files; 03-07 visual+CWV human-verify still pending"
tech-stack:
  added: []
  patterns:
    - "Animated CLS-safe figure = useCountUp(value) → mono tabular-nums fixed-decimals span aria-hidden + sr-only real value + demoted muted unit (mirrors result page hero)"
    - "KPI figure = <KPICell value={<NumberDisplay size=lg className='font-bold' …/>} …/> (Tailwind font-bold beats atom font-normal — later in compiled fontWeight order)"
    - "Loading = layout-mirroring Skeleton sets (no '—' text, no ad-hoc animate-pulse) to avoid CLS on swap"
    - "Stagger = revealStyle(i) → animation reveal 360ms both, delay min(i*60,300)ms, gated off under useReducedMotion (mirrors result page)"
key-files:
  created: []
  modified:
    - web/src/app/app/dashboard/page.tsx
decisions:
  - "Reordered the page column so the hero calc plate sits directly under the header (premium daily-landing feel), then KPI band → Sparkline → Active vehicle → Onboarding → Favoris → Recent. DOM order is presentation-only (MD-2 governs logic/route/data, not layout)."
  - "DataBar micro-viz under Dépenses du mois renders the latest daily expense against the trailing-period peak (value=latestDaily, max=dailyMax from stats.dailyExpenses), guarded to render only when dailyMax > 0 — a meaningful, well-reading ratio with no new data."
  - "Sparkline + Active vehicle split out of the old 2-col grid into two full-width SectionCards (spec: Sparkline full-width, Active vehicle its own card)."
  - "Removed now-unused module-level fmtEur/fmtNum (KPIs use NumberDisplay; recent-row cost keeps inline toFixed) to keep the build ESLint-clean."
  - "SegmentedControl rendered inline (atom is content-width); the atom's own focus handling is unchanged — Cluster B edits the page file only, not shared atoms."
metrics:
  duration: ~7min
  completed: 2026-06-02
  tasks: 2
  files: 1
---

# Phase 3 Plan 03: Cluster B — Dashboard Data-Viz Redesign Summary

Redesigned `/app/dashboard` from a token-swapped form into a designed editorial-dark analytics surface (WEB-03, PD3-3) consistent with the Phase 2 result page: an editorial header, a hero calc-entry plate on `bg-carbon-surface3` with a `SegmentedControl` mode toggle and a `useCountUp`-animated JetBrains-Mono result figure, and a KPI band built from `NumberDisplay` mono figures + a `DataBar` micro-viz + the retained `Sparkline`, plus layout-mirroring `Skeleton` loading and a reduced-motion-aware staggered `reveal`. Visual layer only (MD-2) — `handleQuickCalc`'s distance/budget math, `readUserPrices`/`fuelPrice`/`FALLBACK_PRICES`, `loadData`, vehicle selection, `applySuggestion`, and recent-trip navigation are preserved; the only new state is additive presentation (`quickResultValue`/`quickResultUnit`).

## What Was Built

**Task 1 — Header + hero calc-entry plate (commit `c0e16d7`)**
- Added the missing editorial header: `Eyebrow` "Tableau de bord" + `h1` `font-display font-bold text-display` "Aperçu" (Space Grotesk 700, NO serif — D-11).
- Converted the "Calcul rapide" `SectionCard` into the hero plate via `className="!bg-carbon-surface3"` (mirrors the result-page hero).
- Replaced the two hand-rolled distance/budget tab buttons with a `SegmentedControl` wired to the existing `quickCalcTab` state; its `onChange` resets the result + input (via a new `resetQuickResult()` helper that clears both the string and the additive presentation state).
- Animated the result: added additive state `quickResultValue: number | null` + `quickResultUnit: '€' | 'km' | null`, set alongside the unchanged `setQuickResult(...)` calls in `handleQuickCalc` (numbers identical). `const animatedResult = useCountUp(quickResultValue ?? 0)` runs unconditionally; the result block renders only when `quickResultValue !== null` — figure in JetBrains Mono `tabular-nums text-display` 700 with fixed decimals (2 for €, 0 for km → constant width, no CLS), animating span `aria-hidden`, an `sr-only` sibling holding the real `quickResult` string, and the unit demoted to `text-carbon-muted`.
- Canonical accent focus ring on the numeric `<input>` and the distance quick-chips; neutralized the `text-amber-400` "Aucun véhicule" note to `text-carbon-muted` (D-10 — energy palette reserved for data-viz).

**Task 2 — KPI band data-viz + skeletons + staggered reveal (commit `60425e6`)**
- KPI figures now render via `NumberDisplay` (mono `tabular-nums`, `size="lg"` + `className="font-bold"` for the dominant 700 figure) for Dépenses du mois / Trajets / Distance totale / Économies vs essence, wrapped in `KPICell` so the delta badge + the "Uniquement pour VE" `savedVsGas === null` fallback are retained.
- Added a `DataBar` Variant-B micro-viz under "Dépenses du mois" (`value=latestDaily`, `max=dailyMax` from `stats.dailyExpenses`, `fillVar="var(--c-accent)"`), guarded to render only when `dailyMax > 0`. `scaleX` reveal + reduced-motion gating come from the atom.
- Kept the `Sparkline` "Dépenses 30j" (`var(--c-accent)`) with its "Aucune donnée" empty state; split Sparkline and Active vehicle out of the old 2-col grid into two full-width `SectionCard`s.
- Replaced every `'—'` KPI placeholder and the "Chargement..." text with layout-mirroring `Skeleton` sets (4 KPI tiles + sparkline block + active-vehicle row + 4 recent-row skeletons + a vehicle-select skeleton) so the loading→content swap produces no CLS.
- Applied the existing `reveal` keyframe to the KPI tiles, favoris rows, and recent rows via `revealStyle(i)` (`animation: reveal 360ms ease-out both`, `animation-delay: min(i*60,300)ms`), gated off under `useReducedMotion`. Each favoris/recent row button gained the canonical accent focus ring.
- Normalized all remaining weights to 400/700 (active-vehicle name + onboarding title `font-semibold` → `font-bold`; active-vehicle link + favoris name/"Sélectionner" `font-medium` → `font-normal`); removed unused `fmtEur`/`fmtNum`.

## Deviations from Plan

None — plan executed as written. The page column was reordered (hero plate moved directly under the header) as an intentional presentation choice within MD-2; documented in decisions.

## Verification

| Check | Result |
|-------|--------|
| `cd web; npx tsc --noEmit` | clean (0 errors) |
| `cd web; npm run build` | 18/18 routes compiled, 0 ESLint errors (`/app/dashboard` 5.87 kB) |
| grep `font-medium\|font-semibold\|font-extrabold\|font-serif\|animate-pulse\|bg-emerald\|bg-sky\|bg-violet\|ring-blue-500\|focus:ring-offset-0` over `page.tsx` | 0 matches |
| grep `SegmentedControl\|useCountUp\|NumberDisplay\|DataBar\|Sparkline\|Skeleton` over `page.tsx` | present (26 occurrences) |
| `'—'` KPI placeholders | 0 remaining (replaced by Skeleton sets) |
| Calc/entry parity (handleQuickCalc math, readUserPrices/fuelPrice, vehicle selection, applySuggestion, recent-trip navigation) | unchanged (MD-2); only additive `quickResultValue`/`quickResultUnit` state added |
| CWV | count-up figure fixed-decimal `tabular-nums` (constant width); skeletons mirror layout; reveal/DataBar transform/opacity only, gated by `useReducedMotion` |
| Serif (D-11) | none; title Space Grotesk 700 `text-display` |

## Self-Check: PASSED

- web/src/app/app/dashboard/page.tsx — FOUND
- commit c0e16d7 — FOUND
- commit 60425e6 — FOUND
