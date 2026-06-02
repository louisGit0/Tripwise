---
phase: 03-web-redesign-rollout
plan: 04
subsystem: web-frontend
tags: [garage, restyle, accessibility, editorial-dark, a11y]
requires:
  - "03-01 normalized atoms (SectionCard, CTAButton, Input, Modal, Pill, FuelBadge, BrandAvatar, Eyebrow, Hairline, KPICell, Skeleton)"
provides:
  - "Restyled garage list, vehicle detail, and showroom screens in the editorial-dark language"
  - "Accessible icon-only actions (aria-label + canonical focus ring) across the garage cluster"
affects:
  - "web/src/app/app/garage/* (visual layer only — no CRUD/route/data change)"
tech-stack:
  added: []
  patterns:
    - "Module-level FOCUS_RING constant for the canonical focus token applied to every interactive element"
    - "Skeleton atom placeholders mirroring real layout to avoid CLS (no ad-hoc animate-pulse)"
    - "KPICell (size=sm) for vehicle-detail stats strip, consistent with the dashboard"
key-files:
  created: []
  modified:
    - web/src/app/app/garage/page.tsx
    - web/src/app/app/garage/[id]/page.tsx
    - web/src/app/app/garage/add/page.tsx
decisions:
  - "Showroom data loading (client-load-all catalog fetch + search/filter/group + POST submit) left byte-for-byte intact — CAT-06 / Phase 4 scope fence (MD-2)"
  - "Kept the brand-grouped grid of ModelCards on the showroom (already brand-grouped with BrandAvatar + FuelBadge) rather than refactoring to single-column SectionCard rows — restyle-only, lower risk, no data change"
  - "Search field uses the normalized Input atom with the leading Search icon + clear button overlaid; pl-9/pr-9 override the atom's default x-padding (Tailwind property order: pl/pr win over px)"
metrics:
  duration_min: 7
  completed: 2026-06-02
  tasks: 3
  files: 3
---

# Phase 3 Plan 04: Garage Cluster Restyle Summary

Restyled the garage list, vehicle detail, and showroom (add) screens into the locked editorial-dark language — Skeleton loading, KPICell stats, aria-labelled icon actions with the canonical focus ring — while preserving every garage flow and leaving the showroom's client-load-all data fetch untouched for Phase 4.

## What was built

### Task 1 — Garage list (`garage/page.tsx`) · commit cc17750
- Replaced the ad-hoc `animate-pulse` h-16 loader with three `Skeleton` vehicle-row placeholders (avatar circle + 2 text lines + 3-button actions block) inside `SectionCard(padding="none")`, mirroring the real row to avoid CLS.
- Added a module-level `FOCUS_RING` constant (canonical focus token) and applied it to the star / edit / delete icon buttons.
- Gave each icon-only button a descriptive, vehicle-named `aria-label` ("Définir « … » comme véhicule par défaut", "Modifier le véhicule « … »", "Supprimer le véhicule « … »").
- Vehicle name and edit-modal model name weights moved to `font-bold` (700).
- All CRUD logic, type guards (`hasStats`/`isDefaultVehicle`), and `apiClient` calls unchanged.

### Task 2 — Vehicle detail (`garage/[id]/page.tsx`) · commit 5424ca3
- Migrated the trips / distance / spent / €-km stats strip to `KPICell` (size `sm`), figures still mono `tabular-nums` 700; the `tripsCount > 0` guard preserved.
- Replaced the ad-hoc `animate-pulse` loader with a `Skeleton` layout mirroring header + hero card + form.
- Default-state `Star` indicator now carries `role="img"` + `aria-label="Véhicule par défaut"`; the not-default path keeps the accent `CTAButton` (canonical focus from the atom). Back button gets the canonical focus ring.
- 404 title, hero model name, consumption value, default-section title, and danger-zone title weights normalized to 700.
- `use(params)` resolver, GET `/vehicles/me` find, PATCH save payload, set-default, and delete logic unchanged.

### Task 3 — Showroom (`garage/add/page.tsx`) · commit 0182641 — RESTYLE ONLY
- Swapped the raw search `<input>` for the normalized `Input` atom (canonical focus), keeping the leading `Search` icon and the clear `X` button overlaid.
- Replaced the ad-hoc `animate-pulse` search-loading placeholder with `Skeleton` result-row skeletons.
- Fuel-filter chips, brand-jump directory buttons, and the `ModelCard` button received the canonical focus ring + `aria-label`s; chip and model-name weights to 700.
- **Data loading untouched (CAT-06 / Phase 4 scope fence):** the client-load-all catalog fetch (`/vehicles/catalog` paginated `Promise.all`), the `useMemo` search/filter/group, and the POST `/vehicles/me` submit are byte-for-byte preserved — the diff is exclusively imports / className / aria-label / atom swaps (`input`→`Input`, `div`→`Skeleton`).

## Verification

| Check | Result |
|-------|--------|
| `web npx tsc --noEmit` | PASS (exit 0) |
| `web npm run build` | PASS — 18/18 routes, 0 ESLint errors, 10/10 static pages |
| Grep `font-medium\|font-semibold\|font-extrabold\|font-serif\|ring-blue-500\|focus:ring-offset-0\|animate-pulse` over the 3 files | 0 matches |
| Garage list icon buttons with `aria-label` | 3 (star/edit/delete) |
| Detail uses `KPICell` | yes |
| Showroom data-loading diff | only className/JSX/atom swaps — fetch/search/submit unchanged |

## Deviations from Plan

None — plan executed as written. The two judgement calls (keeping the showroom's brand-grouped ModelCard grid instead of single-column SectionCard rows, and overlaying the Search icon on the `Input` atom) are restyle-only decisions with no logic/data impact; both satisfy the atoms + canonical-focus contract and the MD-2 / Phase-4 scope fence.

## Threat surface

No new surface. All garage CRUD + catalog endpoints, payloads, and ownership checks are unchanged (className/atom swaps only) — consistent with the plan's threat register (T-03-08/09/10 accepted; T-03-SC n/a, no package installs).

## Self-Check: PASSED

All 3 modified files and all 3 task commits (cc17750, 5424ca3, 0182641) verified present.
