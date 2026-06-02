---
phase: 05-mobile-tolls-editorial-redesign
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - shared/src/tokens.ts
  - shared/src/index.ts
  - mobile/constants/theme.ts
  - mobile/metro.config.js
  - mobile/app/_layout.tsx
  - mobile/app/(auth)/login.tsx
  - mobile/app/(tabs)/_layout.tsx
  - mobile/app/(tabs)/dashboard.tsx
  - mobile/app/(tabs)/vehicles.tsx
  - mobile/app/(tabs)/favorites.tsx
  - mobile/app/(tabs)/settings.tsx
  - mobile/src/components/ui/AnimatedCounter.tsx
  - mobile/src/components/ui/DataBar.tsx
  - mobile/src/components/ui/Pill.tsx
  - mobile/src/components/ui/SectionCard.tsx
  - mobile/src/components/ui/Eyebrow.tsx
  - mobile/src/components/ui/Button.tsx
  - mobile/src/components/ui/Input.tsx
  - mobile/src/components/AutocompleteInput.tsx
  - mobile/src/hooks/useReducedMotion.ts
  - mobile/src/types/api.ts
  - mobile/src/i18n/translations/fr.ts
  - mobile/src/i18n/translations/en.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: resolved
md2_regressions: 0
fixed: [WR-01, WR-02, WR-03, IN-04, "Card/MapboxMap dark-default"]
deferred: [IN-01-TabIcon-dead, IN-02-MapboxMap-accent, IN-03-settings-toggle-init]
fix_commits: [31a55f9, "card+mapbox dark-default"]
---

# Phase 5: Code Review Report — Mobile Tolls + Editorial Redesign

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Adversarial review focused on (1) MD-2 restyle regressions in the preserved mobile flows
(auth/calc/CRUD/navigation/theme/i18n), (2) the net-new RN primitives (AnimatedCounter, DataBar,
useReducedMotion), (3) the catalog-browse shape/pagination, and (4) shared-token parity.

The high-risk areas are solid:

- **Token parity (MOB-03):** `shared/src/tokens.ts` values match `web/src/app/globals.css` **exactly**
  for both dark and light ramps (bg/surface×3/ink×3/faint/hairline/accent/ev/fuelGas/fuelDie/fuelGpl/
  toll, plus the light-mode `fuelGpl #7c3aed` / `toll #9b8a6b` contrast overrides). No theme-breaking
  mismatch. Web was not modified; mobile consumes the module via a relative import (the `@verygoodtrip/
  shared` alias is intentionally not used at Metro runtime).
- **Catalog browse (vehicles.tsx):** reads the correct `{items,total,page,limit,totalPages}` shape
  via `r.data.items` — the old `.data.data` bug is gone. Pagination is cancellable (`cancelled` flag),
  page 1 REPLACES / page>1 APPENDS, the query-change reset effect forces page→1 and the in-flight
  higher-page fetch is discarded by cleanup (no stale-append race), debounced (300ms), no client
  load-all. The `total`/`totalPages` fall back safely.
- **Memory/leaks:** `AnimatedCounter` tears down its `Animated.Value` listener and stops the running
  animation on value-change/unmount; `useReducedMotion` removes its `reduceMotionChanged` subscription
  via `.remove()`; `DataBar` stops its reveal animation on cleanup. No leaks / setState-after-unmount.
- **DataBar:** hide-when-toll-0 (`tollValue > 0`), energy-token fills, `pct()` guards zero/NaN totals
  (no divide-by-zero), opacity-only reveal with `useNativeDriver: true` (compositor-friendly).
- **D-11 / weights / no-blue:** no `#3b82f6` / `Primary` / serif literals in production code; 2-weight
  discipline (400/700) held; `console.log` only in `scripts/reset-project.js` (allowed).
- **MD-2 flows preserved:** dashboard calc/charging-mode/vehicle-picker/save-favorite; vehicles add
  (POST /vehicles/me) / edit / delete; favorites use-trip deep-link / delete; settings theme
  (Appearance) / language (i18next) / logout; login zod + OAuth. New toll/catalog i18n keys exist in
  both `fr.ts` and `en.ts`.

No Critical defects. Three Warnings and four Info items below.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Editorial app is dark-default, but four primitives fall back to LIGHT on a null color scheme

**Files:**
- `mobile/src/components/ui/Button.tsx:40`
- `mobile/src/components/ui/Input.tsx:21`
- `mobile/src/components/AutocompleteInput.tsx:27`
- `mobile/app/(tabs)/_layout.tsx:21`

**Issue:** These four read `const scheme = useColorScheme() ?? 'light'`, while every other screen and
atom in the phase defaults to `?? 'dark'` (dashboard, vehicles, favorites, settings, login, Pill,
SectionCard, Eyebrow, AnimatedCounter, DataBar). The canonical editorial direction is dark-default
(web `:root` is the dark ramp). RN `useColorScheme()` can legitimately return `null` (first render
before the appearance module resolves; after `Appearance.setColorScheme(null)` with no OS preference;
certain Android/test states). When it is `null`, the Button/Input/AutocompleteInput/tab-bar render
LIGHT-theme colors (white-ish `surface`, dark `ink`) on a screen whose parent rendered the DARK bg —
a visible wrong-theme primitive / contrast flash. This is exactly the kind of restyle inconsistency
the review targets.

**Fix:** Default to the app's canonical scheme to match the rest of the tree:
```ts
const scheme = useColorScheme() ?? 'dark';
```
Apply in all four files.

### WR-02: Share text shows ENERGY cost only, but the hero displays ENERGY + TOLL total (MOB-02 inconsistency)

**File:** `mobile/app/(tabs)/dashboard.tsx:99`
**Issue:** `ResultCard` renders the hero figure as `total = energyCost + tollCost` (line 309) and the
DataBar/legend break it into Énergie + Péage. But `handleShare` builds the shared string from
`result.cost.totalCost` (energy only):
```ts
const cost = result.cost ? `${result.cost.totalCost.toFixed(2)} €` : '';
```
For any trip with tolls, the user sees e.g. "47,30 €" on screen and shares "42,10 €" — a different,
lower number. Adding tolls (MOB-02) without updating the share path produces a user-facing figure
mismatch.
**Fix:** Share the toll-inclusive total, mirroring the hero:
```ts
const energyCost = result.cost?.totalCost ?? 0;
const tollCost = result.tollCost ?? 0;
const cost = `${(energyCost + tollCost).toFixed(2).replace('.', ',')} €`;
```
(Also note the on-screen total uses a comma decimal via `formatEur`; the share currently uses a dot —
align both to the FR comma for consistency.)

### WR-03: Root layout hangs on a blank screen if font loading errors (no `error` path)

**File:** `mobile/app/_layout.tsx:28-43`
**Issue:** `const [loaded] = useFonts({...})` ignores the second `error` element, and the render guard
is `if (!loaded) return null`. If `useFonts` resolves with `error` set (and `loaded` false), the app
renders `null` permanently and the splash never hides — a blank-screen brick with no recovery. Font
assets are bundled (low real-world probability in production), but the failure mode is severe and the
fix is the standard Expo pattern.
**Fix:** Surface the error and proceed regardless:
```ts
const [loaded, error] = useFonts({ ... });
useEffect(() => {
  if (loaded || error) SplashScreen.hideAsync().catch(() => {});
}, [loaded, error]);
if (!loaded && !error) return null; // render with system fallback on font error
```

## Info

### IN-01: `TabIcon` in the tab layout is dead code (always returns `null`)

**File:** `mobile/app/(tabs)/_layout.tsx:7-17`
**Issue:** `TabIcon` builds an `icons` map and accepts `name`/`color`/`size`, but the function body
ends with `return null` (line 16) and is never referenced in the JSX (no `tabBarIcon`). The map and
all parameters are unused. Tabs render via title labels only.
**Fix:** Remove the `TabIcon` function and its `icons` map, or wire it into `tabBarIcon` with real
icons once the native build is verified (per its own TODO comment).

### IN-02: `MapboxMap` hardcodes the accent hex instead of the token

**File:** `mobile/src/components/MapboxMap.tsx:115` (also `:119`, `:122`, `:141`)
**Issue:** The route line uses `lineColor: '#4d8bff'`, a literal duplicate of `tokens.accent`/`c.ev`.
Origin/destination markers use `#16a34a` / `#ef4444` and a `#fff` border. The accent literal will
drift from the token if the palette ever changes; the marker semaphore colors are functional but
unthemed.
**Fix:** Use `c.accent` for the route line (read `Colors[scheme]`); keep the origin/dest semaphore as
named constants or move them to the token set if they should be themable.

### IN-03: Settings theme toggle initializes to `'system'` regardless of the persisted/active choice

**File:** `mobile/app/(tabs)/settings.tsx:31`
**Issue:** `const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system')` always starts at
`system`. If the user previously selected light/dark via `Appearance.setColorScheme`, re-entering
Settings shows the `system` chip highlighted while the actual override differs — a UI/state desync
(cosmetic; the actual theme is unaffected). Choice is also not persisted across app restarts.
**Fix:** Initialize from the active preference (e.g. derive from `Appearance.getColorScheme()` or a
persisted value), and persist the selection so the highlighted chip reflects reality.

### IN-04: Splash background in `app.config.ts` uses the stale pre-editorial surface hex

**File:** `mobile/app.config.ts:22`
**Issue:** `backgroundColor: '#181612'` is the OLD surface value — `globals.css` documents
`--c-surface: #17150f; /* was #181612 */` and the canonical dark bg is `#0e0c0a` (used correctly at
`:44`). The light splash `#FAFAF7` matches the token. This is token-parity-adjacent staleness on the
splash plate (out of the strict file scope, but inconsistent with MOB-03).
**Fix:** Use the canonical background token (`#0e0c0a`) or the current surface (`#17150f`) for the
splash background to match the editorial ramp.

---

## Inline Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| Warning  | 3 | WR-01 (dark-default fallback inconsistency), WR-02 (share omits toll), WR-03 (font-error blank-screen brick) |
| Info     | 4 | IN-01 (dead TabIcon), IN-02 (hardcoded map accent), IN-03 (theme toggle init desync), IN-04 (stale splash bg) |

**Verdict:** No blocker-tier defects. Token parity, catalog shape/pagination, and the animation/
subscription primitives are correct; MD-2 flows are preserved. Address WR-01 and WR-02 before ship
(both are visible user-facing inconsistencies with trivial fixes); WR-03 is a low-probability but
high-severity robustness gap worth the one-line Expo-standard fix.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
