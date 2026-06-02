---
phase: 03-web-redesign-rollout
plan: 06
subsystem: web-frontend
tags: [editorial-dark, restyle, fuel-prices, settings, cluster-e, WEB-01, WEB-04]
dependency_graph:
  requires: ["03-01 (normalized atoms: CTAButton, SectionCard, Eyebrow, Skeleton, SegmentedControl, Hairline)"]
  provides: ["fuel-prices + settings in editorial-dark language", "completes WEB-01 across Cluster A/C/D/E web screens"]
  affects: ["03-07 visual + CWV human-verify checkpoint"]
tech_stack:
  added: []
  patterns: ["lucide source toggle (RadioTower/Pencil)", "weight-constant segmented/toggle states (CWV)", "Skeleton-atom loading mirroring real layout", "canonical accent focus ring", "Eyebrow section labels"]
key_files:
  created: []
  modified:
    - web/src/app/app/fuel-prices/page.tsx
    - web/src/app/app/settings/page.tsx
decisions:
  - "Kept the custom full-width 2-button source/theme toggles (not SegmentedControl, which is inline-flex) to preserve the existing full-width composition — standardized their interaction states instead (SegmentedControl was optional per the plan)."
  - "Source-toggle and theme-picker active state: source uses bg-carbon-accent text-white; theme picker keeps the sanctioned bg-blue-500/10 text-carbon-accent tint (matches AppLayout active SidebarItem) — both sanctioned per the interfaces block."
metrics:
  duration: ~8min
  tasks: 2
  files: 2
  commits: 2
  completed: "2026-06-02"
---

# Phase 3 Plan 06: Settings Cluster (Fuel-prices + Settings) Editorial-Dark Restyle Summary

Restyled `/app/fuel-prices` and `/app/settings` into the locked editorial-dark language — standardized lucide source toggle, weight-constant theme picker, danger logout, Skeleton loading — closing out WEB-01 across the Cluster A/C/D/E web screens with all price/theme/logout flows preserved (MD-2).

## What Was Built

### Task 1 — Fuel-prices restyle (`0427ae9`)
- **Header:** `h1` `text-2xl` → `text-display` 700 (Space Grotesk, no serif per D-11); `Eyebrow` kicker + lede unchanged.
- **Source toggle (api/custom):** standardized to the segmented/toggle interaction states — inactive `text-carbon-muted`, hover `text-carbon-ink2 bg-carbon-faint`, active `bg-carbon-accent text-white`, **weight constant** `font-normal` across states (CWV, no sub-pixel reflow), canonical accent focus ring, `aria-pressed`.
- **Iconography:** emoji `📡`/`✏️` replaced by lucide `RadioTower` / `Pencil` via a `SOURCE_META` map (label + icon).
- **Section labels:** "Source des prix…", "Carburants", "Électricité" converted from ad-hoc `font-semibold uppercase` `<p>` to the `Eyebrow` atom (700).
- **Read-only price tiles:** value figures + `DeltaBadge` `font-semibold` → `font-bold`, mono `tabular-nums` retained; the `DeltaBadge` trend logic untouched.
- **Loading:** the `animate-pulse` 3-block mount guard → `Skeleton` (header line + 3 card skeletons); the inner `loadingDefaults` "Chargement…" text → a 6-tile `Skeleton` grid mirroring the real price grid (zero ad-hoc `animate-pulse`, no CLS).
- **Preserved (MD-2):** `/prices/defaults` load + `writeApiCache`, `STORAGE_KEY`/`SOURCE_KEY` localStorage read/write, source toggle + info toast, `PriceRow` parse/clamp math, the fast-share `range` (keeps `accent-carbon-accent`), and the save → `writeStorage` + success toast.

### Task 2 — Settings restyle (`8fc63b7`)
- **Header:** `h1` `text-2xl` → `text-display` 700.
- **Apparence theme picker:** `font-medium` → `font-normal` (**weight constant** active/inactive — CWV), canonical accent focus ring + `aria-pressed`; active keeps the sanctioned `bg-blue-500/10 text-carbon-accent` tint (consistent with AppLayout active SidebarItem).
- **Compte:** profile name `font-semibold` → `font-bold`; logout is the danger `CTAButton` "Se déconnecter" wired to the existing `handleLogout`.
- **Version line:** `text-[11px]` → `text-caption` muted mono.
- **Loading:** the `mounted` hydration guard is **preserved** (prevents the next-themes SSR mismatch); its skeleton shape rebuilt from the `Skeleton` atom (no inline `bg-carbon-surface2` placeholder divs).
- **Preserved (MD-2):** the next-themes `useTheme`/`setTheme` wiring, the `mounted` guard, and the logout flow (`logout()` → `router.push('/login')` → `router.refresh()`).

## Verification

- `cd web; npx tsc --noEmit` → 0 errors (both tasks).
- `cd web; npm run build` → compiled successfully, **18/18 routes**, 0 ESLint errors (`/app/fuel-prices` 6.11 kB, `/app/settings` 4.48 kB).
- Grep gate across both files: 0 `font-medium` / `font-semibold` / `font-serif` / `ring-blue-500` / `focus:ring-offset-0` / ad-hoc `animate-pulse`; fuel-prices 0 `📡`/`✏️`.
- Artifact `contains` checks: fuel-prices contains `Skeleton`; settings contains `CTAButton`.

## Deviations from Plan

None — plan executed exactly as written. The optional `SegmentedControl` substitution for the two toggles was deliberately not taken (see Decisions): the existing full-width 2-button composition was kept and its states standardized, which satisfies the weight-constant + canonical-focus acceptance without altering layout.

## Authentication Gates

None.

## Known Stubs

None — no placeholder data, no hardcoded empty values; all data sources (prices load, theme, profile) are wired exactly as before.

## Self-Check: PASSED

- Files exist: `web/src/app/app/fuel-prices/page.tsx` ✓, `web/src/app/app/settings/page.tsx` ✓.
- Commits exist: `0427ae9` (fuel-prices) ✓, `8fc63b7` (settings) ✓.
