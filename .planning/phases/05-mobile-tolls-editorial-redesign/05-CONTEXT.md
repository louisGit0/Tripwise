---
phase: 05-mobile-tolls-editorial-redesign
type: context
source: /gsd:discuss-phase (interactive, 2026-06-02)
requirements: [MOB-01, MOB-02, MOB-03]
---

# Phase 5 Context — Mobile Tolls + Editorial Redesign (FINAL phase)

## Domain

Bring the three milestone outcomes to the Expo (React Native) app: (1) **tolls** with the real/
estimate semantics consistent with web (MOB-02), (2) the **editorial-dark design language** mirrored
in RN StyleSheet (no Tailwind) (MOB-01), and (3) **shared design tokens** between web and mobile
(MOB-03). The backend (tolls, server-side catalog API) and the web design system are already done;
this phase is the RN port. Final phase of the milestone.

## Current mobile state (read before building)

- Expo Router: `mobile/app/(auth)/{login,register}` + `mobile/app/(tabs)/{dashboard,favorites,settings,vehicles}` + layouts.
- `mobile/constants/theme.ts` — OLD blue palette (`Primary` #3b82f6 ramp, light/dark `Colors`) — NOT editorial-dark. The light/dark objects have slightly different shapes → the **7 pre-existing tsc errors** (union mismatch in dashboard/Button + a MapboxMap overload). Rewriting theme.ts to one consistent editorial-dark shape resolves them.
- `mobile/src/components/ui/`: Button, Card, Input, Wordmark (fewer atoms than web). Plus `AutocompleteInput`, `MapboxMap`.
- `mobile/src/` : api (apiClient), auth, context (AuthContext), hooks (useDebounce), i18n (FR/EN), types.
- Dashboard shows calc + results inline (no separate result screen). Vehicles tab = garage + add.
- `@rnmapbox/maps` needs an EAS dev build (placeholder in Expo Go). RN StyleSheet only (no NativeWind — React 19 / new arch).

## Locked / Inherited (from web — mirror, don't re-decide)

- **Editorial-dark tokens** (web `globals.css` + `tailwind.config.ts`): warm-charcoal ramp
  (`--c-bg #0e0c0a`, surface `#17150f`/`#211d16`/`#2a251c`, faint `#2e2820`, hairline `#3a3328`),
  neutral (`--c-ink #f2efe8`, `ink2 #c9c2b4`, `muted #8a8173`), accent `#4d8bff`, energy
  (`ev #4d8bff`, fuel-gas `#ff7849`, fuel-die `#ffc247`, fuel-gpl `#a78bfa`), `toll #b8a98c`.
- **Typography:** Space Grotesk (display/UI) + JetBrains Mono (numerics), **2 weights 400/700**,
  **NO serif (D-11)**. (Load via `@expo-google-fonts/space-grotesk` + `@expo-google-fonts/jetbrains-mono`.)
- **Toll semantics:** backend `POST /trips/calculate` returns `tollCost` + `tollIsEstimate`; always
  estimate in practice (D-07/D-08) → badge "réel" / "≈ estimé" + breakdown, mirroring web.
- **Catalog API:** `GET /vehicles/catalog` (search/brand/fuelType/fuelCategory/page/limit →
  `{items,total,page,limit,totalPages}`) + `GET /vehicles/catalog/brands` — reuse for mobile browse.
- **MD-2 ethos:** preserve existing mobile flows/logic (auth, calc, CRUD) — restyle + add tolls/
  catalog-browse; don't rewrite navigation or backend calls.

## Phase Decisions (from discuss, 2026-06-02)

- **PD5-1 — Shared token module (MOB-03).** Create a TS token module in `shared/src` (canonical
  editorial-dark hex + spacing + font names) that **mobile imports** as its source. Web keeps its
  CSS vars (globals.css) as a documented mirror of the same values — do NOT refactor the locked web
  to consume it (risk). "Shared source where practical."
- **PD5-2 — Fix the 7 pre-existing mobile tsc errors.** Clean baseline so mobile `tsc` passes and
  build verification is meaningful (the theme.ts rewrite to one consistent shape resolves most).
- **PD5-3 — Full RN data-viz/motion parity.** Re-implement in RN: the toll/energy breakdown bar +
  an animated cost counter (Animated API) + a `useReducedMotion` equivalent via
  `AccessibilityInfo.isReduceMotionEnabled` (+ change subscription). Mirror the web's measured
  micro-interactions; transform/opacity-friendly (RN: opacity/transform via Animated), no jank.

## Scope Fence

**In:** shared token module (PD5-1) + rewrite `mobile/constants/theme.ts` to editorial-dark consuming
it; load Space Grotesk + JetBrains Mono (expo-google-fonts); restyle all mobile screens (auth ×2,
dashboard, vehicles, favorites, settings) + tab/auth layouts in editorial-dark; RN atoms to match
(Button/Card/Input + new Pill/SectionCard/Eyebrow/DataBar/AnimatedCounter equivalents as needed);
**tolls on the dashboard result** (breakdown + réel/≈ estimé badge, MOB-02); **catalog browse** on
the vehicles add flow → server-side search via the API (debounced, paginated); fix the 7 tsc errors;
RN reduced-motion.

**Out:** backend changes (done); web changes (locked — only ADD the shared token module, web keeps
CSS vars); precise TollGuru (deferred D-07); a 3rd catalog source; new app features; EAS build/store
submission (dev-build note only — `@rnmapbox/maps` placeholder acceptable in Expo Go).

## Success Criteria (from ROADMAP / MOB-01..03)

1. Mobile screens (auth, dashboard, garage/vehicles, favorites, settings) restyled to the editorial-
   dark direction using RN StyleSheet tokens, existing flows preserved.
2. Mobile trip results show tolls consistent with web (real-vs-estimate badge + breakdown).
3. Design tokens kept consistent between web and mobile (shared source of truth where practical).

## Open Questions For Planning

- Exact `@expo-google-fonts/*` packages for Space Grotesk + JetBrains Mono (weights 400/700) + the
  `useFonts` wiring in the root layout (splash until loaded); confirm they're installable (new deps
  — acceptable here, expo-managed).
- The shared token module shape (`shared/src/tokens.ts`: colors light+dark, spacing, fontFamily,
  fontSize) and how mobile `theme.ts` adapts it to RN (StyleSheet objects, Colors[scheme]).
- RN equivalents: `DataBar` (View widths/Animated), `AnimatedCounter` (Animated.timing + listener →
  formatted FR string), `useReducedMotion` (AccessibilityInfo). Reduced-motion → instant.
- Catalog browse rework on `vehicles.tsx` add flow (debounced query → API, paginated, brand-grouped)
  reusing `useDebounce` + apiClient — mirror the web showroom behavior.
- Whether to add the missing RN atoms (Pill/SectionCard/Eyebrow) or inline styles — match web naming
  where it aids the shared mental model.
- Catalog/i18n: keep existing FR/EN i18n; new strings (toll badge, catalog) added to both.
