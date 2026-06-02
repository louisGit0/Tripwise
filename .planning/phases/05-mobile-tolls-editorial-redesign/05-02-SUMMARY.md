---
phase: 05-mobile-tolls-editorial-redesign
plan: 02
subsystem: mobile
tags: [editorial-dark, fonts, expo-google-fonts, atoms, tsc-baseline, i18n, toll-types]
requires:
  - "shared/src/tokens.ts editorial-dark tokens + mobile ThemeColors shape (05-01)"
  - "@expo-google-fonts/space-grotesk + jetbrains-mono deps (pre-installed in working tree)"
provides:
  - "mobile/app/_layout.tsx — useFonts loading 4 editorial faces with splash gate (no serif)"
  - "editorial-dark Button/Card/Input/Wordmark + AutocompleteInput + MapboxMap (intact prop APIs)"
  - "mobile tsc FULLY GREEN — last 2 baseline errors (Button false-ViewStyle, MapboxMap overload) resolved"
  - "TripResult.tollCost/tollIsEstimate + VehicleModel.source + CatalogPage type"
  - "pre-seeded toll + catalog i18n keys (FR+EN symmetric) for Wave-3 screens"
affects:
  - "all Wave-3 Phase 5 screen plans (05-03..07) consume these fonts/atoms/types/i18n"
tech-stack:
  added:
    - "@expo-google-fonts/space-grotesk ^0.4.1"
    - "@expo-google-fonts/jetbrains-mono ^0.4.1"
  patterns:
    - "Expo SDK 54 useFonts + SplashScreen.preventAutoHideAsync/hideAsync gate"
    - "StyleProp<ViewStyle> array (allows falsy conditional styles) over ViewStyle[]"
    - "cast component-type with explicit children to satisfy JSX overload (MapboxMap MV)"
key-files:
  created: []
  modified:
    - mobile/app/_layout.tsx
    - mobile/src/components/ui/Button.tsx
    - mobile/src/components/ui/Card.tsx
    - mobile/src/components/ui/Input.tsx
    - mobile/src/components/ui/Wordmark.tsx
    - mobile/src/components/AutocompleteInput.tsx
    - mobile/src/components/MapboxMap.tsx
    - mobile/src/types/api.ts
    - mobile/src/i18n/translations/fr.ts
    - mobile/src/i18n/translations/en.ts
    - mobile/package.json
    - mobile/package-lock.json
decisions:
  - "Button primary CTA label uses dark ink #0e0c0a on the bright accent (matches web accent-button contrast, never white-on-accent)."
  - "false-ViewStyle fixed by typing the style array as StyleProp<ViewStyle> (accepts conditional falsy entries) rather than .filter(Boolean)."
  - "MapboxMap overload fixed by adding children:React.ReactNode to the MV cast type; route line recolored #2563eb→#4d8bff editorial accent."
  - "Wordmark defaults now derive from Colors[scheme] (ink/accent) via useColorScheme — no hardcoded hex; passed props still override."
  - "costEstimated added as a distinct key alongside existing dashboard.cost (plan-specified); no existing key removed."
metrics:
  tasks: 3
  files_changed: 12
  commits: 3
  tsc_errors_before: 2
  tsc_errors_after: 0
  completed: 2026-06-02
---

# Phase 5 Plan 02: Mobile Fonts + Editorial Atom Normalization + Toll/Catalog Types Summary

Loaded Space Grotesk + JetBrains Mono (400/700, NO serif) into the Expo root layout behind a splash gate, normalized the shared RN atoms (Button/Card/Input/Wordmark) plus AutocompleteInput/MapboxMap to the editorial-dark tokens — which resolves the last 2 pre-existing mobile tsc errors (Button `false`-ViewStyle + MapboxMap overload) making mobile `tsc --noEmit` FULLY GREEN — and pre-seeded the toll/catalog API types + FR/EN i18n strings every Wave-3 screen will consume.

## What Was Built

- **`mobile/app/_layout.tsx`** — `SplashScreen.preventAutoHideAsync()` at module scope; `useFonts` (from `expo-font`) loads the four faces `SpaceGrotesk_400Regular/700Bold` + `JetBrainsMono_400Regular/700Bold` (keys match `tokens.fontFamily`); `if (!loaded) return null` holds the native splash; an effect calls `SplashScreen.hideAsync()` once loaded. The existing `'../src/i18n'` import, `AuthProvider`, `StatusBar`, `Stack screenOptions`, and `Toast` are preserved verbatim (MD-2 — navigation untouched).
- **`Button.tsx`** — retyped `variantContainer`/`variantLabelColor` params to `ThemeColors`; the style array is now `StyleProp<ViewStyle>` (accepts the conditional `(disabled||loading) && styles.disabled` falsy entry → fixes the `false`-ViewStyle error). Variants mapped to editorial tokens: primary = `accent` bg + dark-ink `#0e0c0a` label, secondary = `surface2` bg + `hairline` border + `ink` label, ghost = transparent + `accent` label, destructive = `fuelGas` bg + white label. Label uses `Fonts.display` weight 700 (no 600). Spinner color follows the label color.
- **`Card.tsx`** — bg `surface`, border `hairline`, radius `card` (12). Padding map preserved.
- **`Input.tsx`** — bg `surface`, border `hairline`/focus `accent`/error `fuelGas`, text `ink`, placeholder `mutedText`, hint `mutedText`; label uses `Fonts.display` weight 700. `TextInputProps` passthrough + focus state preserved.
- **`Wordmark.tsx`** — defaults now derive from `Colors[scheme]` (ink + accent) via `useColorScheme` (no hardcoded `#F0ECE4`/`#4D8BFF`); applies `Fonts.display`; passed `color`/`accent` props still override.
- **`AutocompleteInput.tsx`** — repointed to editorial tokens (input bg→`surface`, border→`hairline`, text→`ink`, placeholder→`mutedText`, dropdown bg→`surface2`, spinner→`accent`); label uses `Fonts.display` 700. The geocode debounce/select logic is verbatim.
- **`MapboxMap.tsx`** — added `children: React.ReactNode` to the `MV` cast type so `<MV>…</MV>` type-checks (fixes the overload error); route `lineColor` changed `#2563eb`→`#4d8bff` (editorial accent); placeholder repointed to `surface2`/`hairline`/`mutedText`. The Expo-Go placeholder branch + all map logic intact; origin/destination marker dots (semantic green/red) left as-is.
- **`mobile/src/types/api.ts`** — `TripResult` gains optional `tollCost?: number | null` + `tollIsEstimate?: boolean` (backend calculate response); `VehicleModel` gains optional `source?: string`; new `CatalogPage { items; total; page; limit; totalPages }` (frozen Phase-4 contract). No existing field removed.
- **`fr.ts` / `en.ts`** — symmetric new keys: `dashboard.{tollLabel, tollReal, tollEstimate, tollEstimateTooltip, energyLabel, costEstimated, breakdown}` and `vehicles.{loadMore, noResults, resultsCount, searchHint}`. Existing keys kept verbatim.

## How It Resolves the tsc Baseline

05-01 left 2 deferred errors. `Button.tsx(42)` `false`-ViewStyle: the `(disabled||loading) && styles.disabled` element is not assignable to `ViewStyle[]` — switching the array type to `StyleProp<ViewStyle>` (which permits falsy entries) clears it. `MapboxMap.tsx(99)` overload: the `MV` cast lacked `children`, so JSX with children matched no overload — adding `children: React.ReactNode` to the cast type clears it. Verified: mobile `npx tsc --noEmit` → **0 errors** (2→0), completing the PD5-2 clean baseline.

## Deviations from Plan

None — the plan executed exactly as written. Rules 1–3 not triggered (no bugs/missing critical functionality/blocking issues beyond the two scoped tsc errors); no architectural decisions (Rule 4); no authentication gates. The font packages were already present in the working tree (resume note), so the first commit included the staged `package.json` + `package-lock.json` instead of running `expo install` (which the plan's resume note explicitly directed).

## Known Stubs

None. The toll/catalog types are real (mirror the backend + frozen Phase-4 contract); the i18n strings are final copy. No placeholder data flows to UI.

## Self-Check: PASSED

- Files modified all present: `mobile/app/_layout.tsx`, `mobile/src/components/ui/{Button,Card,Input,Wordmark}.tsx`, `mobile/src/components/{AutocompleteInput,MapboxMap}.tsx`, `mobile/src/types/api.ts`, `mobile/src/i18n/translations/{fr,en}.ts` — FOUND.
- Commits: `cb0a445` (fonts), `faae17b` (atoms), `0618ed1` (types+i18n) — FOUND.
- mobile `npx tsc --noEmit` → 0 errors; no `#3b82f6`/`#2563eb`/`#F0ECE4`/`#4D8BFF` literals in the components; route line `#4d8bff`; `tollIsEstimate` in api.ts; `tollEstimate(+Tooltip)` in both fr.ts and en.ts.
