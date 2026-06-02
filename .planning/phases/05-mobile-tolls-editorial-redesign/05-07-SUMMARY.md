---
phase: 05-mobile-tolls-editorial-redesign
plan: 07
subsystem: mobile-ui
tags: [mobile, expo, editorial-dark, favorites, settings, restyle]
requires: [05-02, 05-03]
provides: [editorial-dark-favorites, editorial-dark-settings, mobile-editorial-rollout-complete]
affects: [mobile/app/(tabs)/favorites.tsx, mobile/app/(tabs)/settings.tsx]
tech-stack:
  added: []
  patterns: [SectionCard title=Eyebrow surtitle, accent/#0e0c0a vs surface2/hairline toggles, token-styled fuelGas delete control, weight-constant toggle labels]
key-files:
  created: []
  modified:
    - mobile/app/(tabs)/favorites.tsx
    - mobile/app/(tabs)/settings.tsx
decisions:
  - "Favorites/settings restyled visual-layer only (MD-2) — every flow preserved verbatim"
  - "Delete control mirrors D-23 vehicles pattern: token-styled fuelGas text label, NOT Ionicons (Expo-Go-safe)"
  - "Toggle labels are weight-constant (always display 700) — only bg + label color change on active"
metrics:
  duration: ~6min
  tasks: 2
  files: 2
  completed: 2026-06-02
---

# Phase 5 Plan 07: Editorial-Dark Favorites + Settings Summary

Restyled the last two mobile screens (favorites + settings) to editorial-dark using the shared tokens and editorial atoms (SectionCard, Eyebrow, Button), completing the editorial-dark rollout across all mobile screens (MOB-01). Every flow is preserved verbatim (MD-2): favorite use-trip deep-link + delete; settings theme picker (Appearance), language switch (i18next), and logout (signOut).

## What Was Built

### Task 1 — Editorial-dark favorites (`620f5fd`)
- Page bg → editorial `bg`; header is an `Eyebrow` surtitle (`nav.favorites`) above a `Fonts.display` 700 `ink` heading.
- Favorite rows moved from the legacy `Card` into the editorial `SectionCard`: name in `ink` display 700; origin/destination lines in `ink2` (display-regular 400); the `↓` arrow in `mutedText`.
- The "Utiliser" (use-trip) control is now the accent `Button` atom (`size="sm"` — accent bg + `#0e0c0a` ink label).
- The 🗑 emoji delete control was replaced with a token-styled text label (`common.delete`) colored `fuelGas` (destructive), mirroring the D-23 vehicles pattern (Expo-Go-safe, no vector-icons).
- Empty state text → `mutedText`. Weights normalized 400/700; no blue literals.
- `load`, `handleUseTrip` (deep-link to `/(tabs)/dashboard?...`), and `handleDelete` (Alert + `DELETE /favorites/:id` + Toast) preserved verbatim (MD-2).

### Task 2 — Editorial-dark settings (`9475d10`)
- Page bg → editorial `bg`; header is an `Eyebrow` surtitle (`nav.settings`) above a `Fonts.display` 700 `ink` heading; `useColorScheme()` default `'light'`→`'dark'`.
- The three sections (theme/language/account) use `SectionCard` with the `title` prop, which renders the `Eyebrow` surtitle (caption, muted, 700, weight-constant) — replacing the legacy 600-weight section labels.
- Option toggles (light/dark/system, fr/en): active = `accent` bg + `accent` border + `#0e0c0a` ink label; inactive = `surface2` bg + `hairline` border + `ink` label. The label font weight is **constant** (always display 700) — only the background + label color change on active (no weight jump).
- Account logout uses the destructive `Button` (`fuelGas`). The version line → `mutedText` mono caption (`Fonts.monoRegular`, `FontSize.caption`).
- `applyTheme` / `Appearance.setColorScheme`, `changeLanguage` / `i18n.changeLanguage`, `handleLogout` / `signOut`, and the `version` read preserved verbatim (MD-2).

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` per-file (favorites) | clean |
| `npx tsc --noEmit` per-file (settings) | clean |
| `npx tsc --noEmit` full mobile run | EXIT 0 (GREEN) |
| blue literals / `c.primary` / 500-600 weights (both files) | 0 matches |
| use-trip deep-link / delete / theme / language / logout flows | preserved verbatim (MD-2) |

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered.

## Threat Surface

Both threats in the plan register held (accept dispositions, restyle-only):
- T-05-07-01 (logout / session): `signOut` token clear unchanged.
- T-05-07-02 (favorite delete): authed `DELETE /favorites/:id` with backend ownership check unchanged.

No new security-relevant surface introduced.

## Notes for Future Plans

- Editorial-dark rollout is now complete across all mobile screens (auth, dashboard, garage, favorites, settings, trips primitives). MOB-01 fully satisfied on mobile.
- The delete-control pattern (token-styled `fuelGas` text label) and the weight-constant toggle pattern are now consistent across mobile garage + settings — reuse for any future destructive/toggle controls.

## Self-Check: PASSED

- FOUND: mobile/app/(tabs)/favorites.tsx
- FOUND: mobile/app/(tabs)/settings.tsx
- FOUND commit: 620f5fd (favorites)
- FOUND commit: 9475d10 (settings)
