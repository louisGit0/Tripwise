---
phase: 2
plan: 04
subsystem: web-frontend
tags: [editorial-dark, data-viz, trip-result, motion, a11y, web]
requires:
  - "02-01 tokens (--c-surface3, --c-fuel-gpl, --c-toll, --text-* sizes, Instrument Serif, font-serif)"
  - "02-02 hooks (useCountUp, useReducedMotion)"
  - "02-03 primitives (DataBar Variant A/B, Skeleton)"
provides:
  - "Redesigned editorial-dark trip result page (proof slice — DES-02/03/04 + WEB-02 user-observable)"
  - "reveal keyframe in globals.css (staggered reveal infra)"
affects:
  - "web/src/app/app/trips/result/page.tsx"
  - "web/src/app/globals.css"
tech-stack:
  added: []
  patterns:
    - "Hooks called unconditionally before the session guard (heroTarget safe-defaulted to 0)"
    - "Animated figure = aria-hidden mono counter + sr-only formatted real value (no aria-live)"
    - "Energy/toll fills via CSS-var (var(--c-ev|--c-fuel-gas|--c-fuel-die|--c-fuel-gpl|--c-toll)) — no Tailwind palette classes"
    - "Staggered reveal via inline animation-delay, gated off under useReducedMotion"
key-files:
  created: []
  modified:
    - "web/src/app/app/trips/result/page.tsx"
    - "web/src/app/globals.css"
decisions:
  - "Amber disclaimer washes (bg-amber-500/10) converted to neutral token style (bg-carbon-surface2 + text-carbon-ink2 + hairline) to satisfy the hard no-bg-amber verification grep — supersedes the prose 'keep amber wash' instruction, consistent with Task 1 acceptance (no ad-hoc amber in hero region)."
  - "Hero SectionCard elevation forced with !bg-carbon-surface3 (Tailwind important) so it deterministically overrides SectionCard's default bg-carbon-surface."
metrics:
  duration: "~13min"
  tasks: 2
  files: 2
  completed: "2026-06-02"
---

# Phase 2 Plan 04: Trip Result Page Editorial-Dark Redesign Summary

Restyled `result/page.tsx` into the editorial-dark proof slice — serif route title, animated mono hero counter (CLS-safe, a11y-correct), token-driven Énergie/Péage breakdown + multi-energy comparison bars, designed interaction states, and a layout-mirroring skeleton — same data, same flow, same calculations (MD-2).

## What Was Built

**Task 1 — Hero region (commit `9a0d217`)**
- Header `h1` route title → Instrument Serif (`font-serif text-display`, weight 400), `→` separator muted.
- Hero plate on elevation 3 (`!bg-carbon-surface3`); "Coût estimé" eyebrow tokenized (`text-caption font-bold tracking-eye uppercase`).
- Hero figure = `useCountUp(perPerson)` rendered in JetBrains Mono `text-hero` weight 700 `tabular-nums` with fixed 2 decimals. The animating span is `aria-hidden`; a sibling `sr-only` span carries `fmtEur.format(perPerson)` (the real value, no `aria-live`). `€` demoted to `text-display`/muted. → zero CLS.
- Variant A `DataBar` Énergie/Péage breakdown + a dotted legend row (6px color dots matching segments; Péage legend carries the existing réel/≈ estimé `Pill`+`Tooltip`). When `tollCost === 0`, both the toll segment (DataBar internal) and the Péage legend are hidden → single full-width energy bar (D-04 preserved).
- 2×2 metric tiles get the `reveal` staggered animation (new keyframe in `globals.css`), gated off under `useReducedMotion`.
- Tokenized every size/weight in the hero region (`text-2xl/4xl/[10px]/[104px]` → `text-hero/display/body/caption`; `font-semibold/medium` → `font-bold/normal`).

**Task 2 — Comparison + interaction + skeleton (commit `c28043c`)**
- Deleted the ad-hoc `categoryColor()` helper; comparison rows now render via Variant B `DataBar` with `var(--c-ev|--c-fuel-gas|--c-fuel-die|--c-fuel-gpl)` fills by category, cheapest-first preserved, section still hidden when no comparisons. Current-energy row = full-opacity fill + label `text-carbon-ink` + `← actuel` accent marker; non-current rows muted (`muted` prop → opacity 0.45) + label `text-carbon-ink2`.
- Standardized `focus-visible:ring-carbon-accent/50` ring across interactive elements (`FOCUS_RING` const).
- Stepper: `aria-label="Retirer un passager"` / `"Ajouter un passager"` (checker FLAG 1), plus hover/active states + standardized ring; 1–9 math untouched.
- Replaced the 3-block `animate-pulse` placeholder with a `Skeleton`-based skeleton mirroring the new layout (header + hero plate + 2×2 tiles + breakdown bar + legend + comparison rows + 2 CTA buttons) — CLS-safe swap.

## Preserved Behavior (MD-2)

`sessionStorage` read + `router.replace('/app/dashboard')` guard, `handleSave` payload + `/trips/save` endpoint + navigation, `handleNewTrip`, the passengers stepper math (1–9, per-person division), `multiResult` comparison data, `isFuelCost`/`formatDuration`/`fmtEur`, `canSave`/`hasToll`/`totalCost` derivations — all unchanged. No routes, data shapes, or calculations changed.

## Deviations from Plan

### Auto-fixed / harmonization

**1. [Rule 3 - Harmonize with verification] Amber disclaimer washes → neutral tokens**
- **Found during:** Task 1.
- **Issue:** The plan prose said "keep the distance-mode + EV-disclaimer amber wash notes," but Task 1 acceptance AND the verification grep both forbid `bg-amber` anywhere in the file. The literal `bg-amber-500/10` would fail the grep.
- **Fix:** Converted both notes to `bg-carbon-surface2 text-carbon-ink2 border border-carbon-hairline rounded-lg` — fully on-token, still reads as a soft informational note. No energy token used (energy palette stays data-viz-only per the color contract).
- **Files modified:** `web/src/app/app/trips/result/page.tsx`
- **Commit:** `9a0d217`

## Threat Surface

No new surface. The existing `sessionStorage` `JSON.parse` + guard path is unchanged; all values render as text / CSS widths (no `dangerouslySetInnerHTML`). `handleSave` payload + endpoint untouched. Disposition matches the plan's accept register (T-02-07/08/09). No package installs.

## Verification

- `cd web; npx tsc --noEmit` → 0 errors (after each task).
- `cd web; npm run build` → all 18 routes compile, 0 ESLint errors (`/app/trips/result` 7.15 kB).
- Grep `result/page.tsx`: 0 matches for `categoryColor|bg-emerald|bg-sky|bg-violet|bg-amber|font-medium|font-semibold`; 24 matches for `DataBar|Skeleton|useCountUp|useReducedMotion|font-serif|aria-label|var(--c-toll)`.

## Self-Check: PASSED

- `web/src/app/app/trips/result/page.tsx` — FOUND
- `web/src/app/globals.css` (reveal keyframe) — FOUND
- commit `9a0d217` — FOUND
- commit `c28043c` — FOUND
