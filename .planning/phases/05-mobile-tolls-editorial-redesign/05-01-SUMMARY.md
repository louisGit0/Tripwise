---
phase: 05-mobile-tolls-editorial-redesign
plan: 01
subsystem: mobile + shared
tags: [design-tokens, theme, metro, monorepo, editorial-dark, tsc-baseline]
requires:
  - "web globals.css editorial-dark token values (canonical source mirrored)"
provides:
  - "shared/src/tokens.ts — framework-free canonical editorial-dark tokens (dark+light)"
  - "shared barrel re-export of tokens"
  - "mobile/metro.config.js — watchFolders wiring for the out-of-root shared module"
  - "mobile/constants/theme.ts — single ThemeColors shape consuming shared tokens"
  - "clean type baseline: mobile tsc 7→2 errors (only deferred 05-02 errors remain)"
affects:
  - "all later Phase 5 plans (05-02..07) build on this token + theme foundation"
tech-stack:
  added: []
  patterns:
    - "Expo SDK 54 monorepo Metro pattern (watchFolders + nodeModulesPaths)"
    - "single-interface light/dark theme (superset legacy+editorial keys) to kill Colors[scheme] union errors"
key-files:
  created:
    - shared/src/tokens.ts
    - mobile/metro.config.js
  modified:
    - shared/src/index.ts
    - mobile/constants/theme.ts
decisions:
  - "Web NOT refactored (PD5-1): tokens mirror globals.css values; web keeps its CSS vars."
  - "muted collision resolved: legacy muted = surface2 (fill); editorial muted text exposed as mutedText."
  - "Metro hierarchical lookup left ENABLED (per-project node_modules, no hoisted workspace)."
  - "theme imports via RELATIVE path (../../shared/src/tokens) — resolves at Metro runtime; alias would not."
metrics:
  tasks: 3
  files_changed: 4
  commits: 3
  tsc_errors_before: 7
  tsc_errors_after: 2
  completed: 2026-06-02
---

# Phase 5 Plan 01: Shared Editorial-Dark Tokens + Mobile Theme Foundation Summary

Framework-free shared token module (canonical editorial-dark hex matching web `globals.css`, light + dark) wired into the Expo app via a Metro monorepo config, with `mobile/constants/theme.ts` rewritten to one consistent `ThemeColors` shape — clearing 5 of the 7 pre-existing mobile tsc errors and removing the legacy blue palette.

## What Was Built

- **`shared/src/tokens.ts`** — a pure TypeScript module with ZERO imports exporting `tokens` (+ `Tokens` / `ThemeColorTokens` types). `colors.dark` and `colors.light` each carry exactly the 15 canonical keys (`bg, surface, surface2, surface3, ink, ink2, muted, faint, hairline, accent, ev, fuelGas, fuelDie, fuelGpl, toll`) with hex values mirroring `web/src/app/globals.css` exactly (dark `bg #0e0c0a` … `toll #b8a98c`; light `bg #fafaf7` … light-only `fuelGpl #7c3aed` / `toll #9b8a6b`). Plus `fontFamily` (Space Grotesk + JetBrains Mono loaded-font keys, NO serif — D-11), `fontWeight` (400/700 only), `fontSize` (4-size scale 56/26/14/11), `spacing` (8-pt), and `radius` (incl. `card:12`). Re-exported from `shared/src/index.ts`.
- **`mobile/metro.config.js`** — Expo SDK 54 monorepo pattern: `getDefaultConfig(__dirname)` + `watchFolders = [repo root]` so Metro bundles the out-of-project `shared/` module, + `resolver.nodeModulesPaths = [project, root]`. Hierarchical lookup left enabled (separate per-project lockfiles, no hoist).
- **`mobile/constants/theme.ts`** — rewritten to import `tokens` via a real relative path and build `Colors: Record<ColorScheme, ThemeColors>` where light and dark share ONE `ThemeColors` interface. The blue `Primary` ramp (`#3b82f6`) is deleted. `ThemeColors` is a superset: editorial keys + every legacy key existing screens read (`text/textSecondary/background/card/border/tint/icon/tabIcon*/primary/primaryLight/destructive/success/amber/amberBg/inputBg/inputBorder/placeholder/muted/mutedFg`), each remapped to an editorial token. `Fonts`, `Spacing`, `Radius` sourced from tokens; legacy `FontSizes` (xs..2xl) preserved so un-restyled screens keep compiling.

## How It Resolves the tsc Baseline

The old theme used `as const` on divergent light/dark literal objects, so `Colors[scheme]` was a union not assignable to `typeof Colors.light` — the root of 5 of the 7 errors (`dashboard.tsx` 223/224/226, `Button.tsx` 41/49). Giving both schemes one explicit `ThemeColors` interface collapses the union. Verified: mobile `npx tsc --noEmit` drops from **7 → 2** errors. The remaining 2 (`MapboxMap.tsx(99)` overload, `Button.tsx(42)` `false`-ViewStyle) are NOT color-union errors and are explicitly scoped to 05-02.

## Deviations from Plan

### Adjustments

**1. tsconfig.json not modified (predicted in `files_modified`)**
- **Found during:** Task 2
- **Why:** `mobile/tsconfig.json` already had the `@verygoodtrip/shared` alias and has no `exclude` blocking `../shared`. TypeScript resolves the relative import (`../../shared/src/tokens`) by following the import regardless of `include` entry points, so no change was required. Verified by tsc resolving the module (no module-not-found error; only the 2 deferred errors remain).
- **Files modified:** none (tsconfig left untouched)

No bug/security auto-fixes were required (Rules 1–3 not triggered). No architectural decisions (Rule 4) arose. No authentication gates.

## Known Stubs

None. The token values are real (mirrored from the locked web contract); `success` green (`#4ade80`/`#16a34a`) is a deliberate non-editorial accessible green documented in `theme.ts`, not a placeholder.

## Self-Check: PASSED

- Files: `shared/src/tokens.ts`, `shared/src/index.ts`, `mobile/metro.config.js`, `mobile/constants/theme.ts` — all FOUND.
- Commits: `0462387`, `4134396`, `3f7250f` — all FOUND.
- `shared` tsc clean (exit 0); mobile tsc 2 errors (deferred); no `#3b82f6`/`Primary` in theme.ts; metro.config.js loads via node require with `watchFolders` + `nodeModulesPaths`.
