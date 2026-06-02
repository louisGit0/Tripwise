---
phase: 03-web-redesign-rollout
plan: 05
subsystem: web-frontend
tags: [editorial-dark, restyle, trips, favorites, data-viz, a11y, MD-2]
requires:
  - "03-01 (normalized ui/ atoms: CTAButton/SectionCard/Eyebrow/FuelBadge/Skeleton/Pill + canonical focus token)"
  - "02-03 (DataBar Variant A énergie/péage + Skeleton atom)"
  - "02-04 (result page — the reference pattern this detail page mirrors)"
provides:
  - "Restyled trips history /app/trips — standardized filter chips, month-grouped rows, Skeleton loading"
  - "Restyled trip detail /app/trips/[id] — result-page mirror (mono text-hero figure, Variant A DataBar breakdown, toll badge in péage legend), Space Grotesk title (no serif)"
  - "Restyled favorites /app/favorites — SectionCard row lists, Utiliser accent action, danger delete Modal, Skeleton loading"
affects:
  - "web/src/app/app/trips/page.tsx"
  - "web/src/app/app/trips/[id]/page.tsx"
  - "web/src/app/app/favorites/page.tsx"
tech-stack:
  added: []
  patterns:
    - "Variant A DataBar (énergie/péage) reused on the trip-detail page, sized energyValue=totalCost-tollsCost / tollValue=tollsCost / total=totalCost"
    - "Canonical focus ring constant (focus-visible:ring-carbon-accent/50 + offset) on every interactive element"
    - "Layout-mirroring Skeleton sets replacing ad-hoc animate-pulse placeholders"
    - "Filter chips: weight-constant active/inactive (color/bg only) — no CLS on toggle"
key-files:
  created: []
  modified:
    - "web/src/app/app/trips/page.tsx"
    - "web/src/app/app/trips/[id]/page.tsx"
    - "web/src/app/app/favorites/page.tsx"
decisions:
  - "D-12 — trip-detail toll badge single source of truth: réel/≈ estimé Pill+Tooltip relocated verbatim into the Variant A DataBar péage legend; the duplicate 'Péages' row removed."
  - "Trip-detail hero is a static mono text-hero figure (no useCountUp) — it shows a saved historical value, not a live calculation."
metrics:
  duration: "~11 min"
  tasks: 3
  files: 3
  completed: "2026-06-02"
---

# Phase 3 Plan 05: Trips Cluster (history + detail + favorites) Editorial-Dark Restyle Summary

Restyled the trips cluster — history, trip detail (mirroring the Phase-2 result page in Space Grotesk, no serif, with a Variant A DataBar toll breakdown), and favorites — into the locked editorial-dark language with standardized filter chips, month-grouped row lists, danger delete Modal, canonical focus rings, and layout-mirroring Skeleton loading; every existing flow (filter/pagination, note auto-save, archive/refaire/delete, favorite use/delete) preserved (MD-2). Web `tsc` clean, `build` 18/18 green.

## What Was Built

### Task 1 — Trips history `/app/trips` (commit `3e25486`)
- Header `h1` migrated `text-2xl font-bold` → `font-display font-bold text-display` (Space Grotesk 700).
- Stats-strip + month-header labels: `font-semibold` → `text-caption font-bold` (eyebrow tier).
- Filter chips standardized to the segmented/chip states: inactive `text-carbon-muted`, hover `text-carbon-ink2 bg-carbon-faint`, active `bg-carbon-accent text-white`, **weight constant** (`font-normal` across all states → no CLS), canonical focus ring.
- Month-grouped rows: row buttons get the canonical focus ring; route line `text-sm font-medium` → `font-normal`; `ChevronRight` marked `aria-hidden`.
- Loading: ad-hoc `animate-pulse h-16 ×6` replaced with a month-header + 6 row `Skeleton`s mirroring the real row layout.
- `groupByMonth`, the `fuelCategory` filter, "Charger plus" pagination (`page < totalPages`), and `router.push` navigation untouched.

### Task 2 — Trip detail `/app/trips/[id]` (commit `cf86a9b`)
- Route title `text-base font-semibold` → `font-display font-bold text-display` Space Grotesk, `→` muted (NO serif, D-11).
- Total rendered as a mono `text-hero` `tabular-nums` figure (French comma) on a `!bg-carbon-surface3` hero plate, mirroring the result page; the `€` unit demoted to `text-display font-normal text-carbon-muted`.
- Variant A `DataBar` énergie/péage breakdown rendered when `trip.tollsCost > 0` (D-04 hide-when-0), sized `energyValue=totalCost−tollsCost / tollValue=tollsCost / total=totalCost` with `energyFillVar(fuelType)`.
- The réel/≈ estimé `Pill` + `Tooltip` (Phase 1) **relocated verbatim** (same copy/logic) into the péage legend; the separate "Péages" row removed (D-12 — single source of truth).
- Metric-grid + 404 labels normalized to 400/700; back button gets canonical focus + `aria-hidden` chevron; note saving indicator de-pulsed (`animate-pulse` removed).
- Loading: `animate-pulse` block replaced with a `Skeleton` set mirroring title + hero + breakdown + metric grid + cards.
- `use(params)` resolver, `GET /trips/:id`, note auto-save (`useDebounce` + `savedNoteRef`), archive PATCH, "Refaire" URL build, and delete `Modal` flow all unchanged.

### Task 3 — Favorites `/app/favorites` (commit `2bea436`)
- Header `h1` → `font-display font-bold text-display` (700).
- Favorite name `font-semibold` → `font-bold`; row hover `bg-carbon-surface2`.
- Loading: "Chargement…" text replaced with 4 `SectionCard` `Skeleton` rows mirroring the list.
- Delete icon button gets the canonical focus ring + clearer `aria-label` ("Supprimer ce favori"); `Trash2` marked `aria-hidden`.
- "Utiliser" deep-link build → `router.push` and the danger delete `Modal` preserved.

## Verification

- `cd web; npx tsc --noEmit` → 0 errors (run after each task).
- `cd web; npm run build` → all 18 routes compiled, 0 type/ESLint errors.
- Grep gate across the 3 files: **0** `font-medium` / `font-semibold` / `font-extrabold` / `font-serif` / `ring-blue-500` / `focus:ring-offset-0` / ad-hoc `animate-pulse`.
- Trip detail `contains` `DataBar` (acceptance artifact); trips history `contains` `Skeleton` (acceptance artifact).
- `Pill` + `Tooltip` réel/≈ estimé badge preserved on the detail page; filter chips weight-constant across states.

## Deviations from Plan

### Auto-fixed / In-scope adjustments

**1. [Rule 2 — a11y FLAG fold-in] Toll badge relocated rather than duplicated**
- **Found during:** Task 2.
- **Issue:** The existing detail page rendered the réel/≈ estimé badge in a standalone "Péages" row; mirroring the result page (which carries the badge in the DataBar péage legend) would have duplicated it.
- **Fix:** Moved the `Pill`+`Tooltip` verbatim into the breakdown legend and removed the standalone row — one canonical badge location, matching the result page. Logic/copy unchanged. (Documented as D-12.)
- **Files modified:** `web/src/app/app/trips/[id]/page.tsx` — commit `cf86a9b`.

**2. [Rule 3 — consistency] Detail note saving indicator de-pulsed**
- **Found during:** Task 2.
- **Issue:** The note "saving" indicator used `animate-pulse`, which the phase-level verification forbids (no ad-hoc `animate-pulse`).
- **Fix:** Replaced the pulsing "…" with a static `text-caption` "Enregistrement…" label. No behavior change.
- **Files modified:** `web/src/app/app/trips/[id]/page.tsx` — commit `cf86a9b`.

No other deviations — plan executed as written. No architectural changes (no Rule 4). No authentication gates. No package installs (threat T-03-SC: n/a).

## Threat Surface

No new network endpoints, auth paths, file access, or schema changes — restyle is visual-layer only (MD-2). Threat register dispositions (T-03-11/12 accept, T-03-SC n/a) hold: no PATCH/DELETE payloads, debounce, or ownership checks were touched; no new data surfaced.

## Known Stubs

None. All three screens are fully wired to their existing live data sources (`/trips/history`, `/trips/stats`, `/trips/:id`, `/favorites`); no placeholder/mock data introduced.

## Notes for Downstream

- The trip-detail page now fully mirrors `result/page.tsx`. Any future change to the result-page hero/DataBar composition should be reflected here for consistency (the 03-07 visual checkpoint covers this).
- Remaining Wave-2 clusters: 03-03 (dashboard data-viz), 03-04 (garage cluster), 03-06 (fuel-prices + settings). Then 03-07 visual + CWV human-verify checkpoint.

## Self-Check: PASSED

- Files: FOUND `web/src/app/app/trips/page.tsx`, FOUND `web/src/app/app/trips/[id]/page.tsx`, FOUND `web/src/app/app/favorites/page.tsx`.
- Commits: FOUND `3e25486`, FOUND `cf86a9b`, FOUND `2bea436`.
