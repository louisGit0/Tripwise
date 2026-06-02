---
phase: 05-mobile-tolls-editorial-redesign
plan: 05
subsystem: mobile
tags: [dashboard, tolls, editorial-dark, data-viz, animated-counter, reduced-motion, MOB-01, MOB-02]
requires:
  - "mobile editorial ThemeColors + tokens (05-01)"
  - "mobile editorial fonts + normalized atoms + TripResult.tollCost/tollIsEstimate + toll i18n (05-02)"
  - "mobile DataBar / AnimatedCounter / Pill / SectionCard / Eyebrow / useReducedMotion primitives (05-03)"
provides:
  - "mobile/app/(tabs)/dashboard.tsx — editorial-dark dashboard with hero AnimatedCounter total (energy+toll) + Énergie/Péage Variant-A DataBar + réel/≈ estimé toll Pill"
affects:
  - "Phase 5 wrap / verification: the milestone mobile toll display (MOB-02) ships here, consistent with web trip-result"
tech-stack:
  added: []
  patterns:
    - "RN inline result card mirroring the web trip-result (hero total = energy+toll, Variant-A breakdown, hide-when-toll-0 D-04)"
    - "tappable Pill → Alert tooltip substitute (RN has no hover) for the toll-estimate explanation"
    - "energy-segment fill chosen by fuelType (ELECTRIC→ev, DIESEL→fuelDie, GPL→fuelGpl, else fuelGas) — mirrors web energyFillVar"
key-files:
  created: []
  modified:
    - mobile/app/(tabs)/dashboard.tsx
decisions:
  - "Extracted the toll-aware result into an in-file `ResultCard` sub-component (props: result/c/t/onShare/onAddFavorite) so the main screen stays readable; reduced motion is handled internally by AnimatedCounter + DataBar, so no extra hook is threaded."
  - "The toll badge is wrapped in a TouchableOpacity that fires Alert.alert(tollLabel, tollEstimateTooltip) — RN has no hover tooltip, so a tap is the platform-honest equivalent of the web Tooltip."
  - "Cost moved out of the StatItem row into the animated hero; the metrics row keeps distance + duration only (cost is the hero), avoiding a duplicate cost figure."
metrics:
  tasks: 2
  files_changed: 1
  commits: 2
  tsc_errors_before: 0
  tsc_errors_after: 0
  completed: 2026-06-02
---

# Phase 5 Plan 05: Dashboard Restyle + Mobile Tolls Summary

Restyled the Expo dashboard to editorial-dark and shipped the milestone mobile toll display (MOB-01 + MOB-02): the inline trip result now shows an animated hero total (energy + toll) via the RN `AnimatedCounter`, an Énergie/Péage Variant-A `DataBar` breakdown, and the réel / ≈ estimé `Pill` driven by `result.tollIsEstimate` — the toll line hidden entirely when there is no toll (D-04), consistent with the web trip-result. All calc / entry / charging-mode / vehicle-picker / share / save-favorite flows preserved verbatim (MD-2); mobile `tsc --noEmit` GREEN.

## What Was Built

### Task 1 — Editorial-dark dashboard shell + calc form restyle (`db912a9`)
- Page background → editorial `bg`; `useColorScheme()` default flipped `'light'` → `'dark'` (editorial-dark first paint, consistent with 05-04).
- Header is a display heading (`Fonts.display` 700, `c.ink`) under an `Eyebrow` surtitle; in-form section labels (vehicle, charging mode) replaced the old 500-weight `styles.label` with the `Eyebrow` atom.
- Calc inputs, result, and the favorite modal wrapped in the editorial `SectionCard` (the legacy `Card` import dropped).
- **Vehicle chips + charging-mode buttons:** active = `accent` bg + `#0e0c0a` ink label, inactive = `surface2` bg + `hairline` border + `ink` label (the old `c.primary`/`c.muted` blue look removed).
- `StatItem` retyped from `c: typeof Colors.light` → `c: ThemeColors`; numerics use `Fonts.mono` (JetBrains Mono).
- EV disclaimer wash → neutral `surface2`/`ink2` boxed note (NOT amber — mirrors web D-10).
- All weights normalized to 400/700 (no 500/600 remain).

### Task 2 — Toll-aware result: hero AnimatedCounter + Énergie/Péage DataBar + réel/≈ estimé badge (`5dcdfb4`)
- Added an in-file `ResultCard` that computes `energyCost = cost?.totalCost ?? 0`, `tollCost = result.tollCost ?? 0`, `total = energyCost + tollCost`, `hasToll = result.tollCost != null && > 0`, `tollIsEstimate = result.tollIsEstimate ?? false`.
- **Hero** on the elevated `surface3` plate: an `Eyebrow` `dashboard.costEstimated`, then `<AnimatedCounter value={total} />` (mono, `FontSize.hero`) + a display-weight `€` suffix — instant under reduced motion via the counter's internal `useReducedMotion`.
- **Breakdown** (rendered only when `total > 0`): `<DataBar variant A energyValue tollValue total energyFill />` where `energyFill` is chosen by `result.vehicle.fuelType` (ELECTRIC→`ev`, DIESEL→`fuelDie`, GPL→`fuelGpl`, else `fuelGas`), followed by a legend — an "Énergie · {amount}" row (dot in `energyFill`) and, **only when `hasToll`**, a "Péage · {amount}" row (dot in `c.toll`) + the toll badge. The entire toll line/segment is hidden when `!hasToll` (D-04; the DataBar also hides its toll segment at `tollValue<=0`).
- **Toll badge:** `<Pill color={tollIsEstimate ? 'warning' : 'success'} size="sm">{tollIsEstimate ? tollEstimate : tollReal}</Pill>`, wrapped in a `TouchableOpacity` that fires `Alert.alert(tollLabel, tollEstimateTooltip)` (RN tooltip substitute).
- Kept the distance/duration `StatItem` metrics, the neutral EV disclaimer, and the share / add-favorite actions; euros formatted FR (comma, 2dp). `handleShare` / favorite flow unchanged.

## Deviations from Plan

### Adjustments

**1. Cost figure relocated from the metrics row to the animated hero**
- The pre-existing result card showed the total cost as a third `StatItem`. The toll-aware design makes the total the animated hero, so the metrics row now carries distance + duration only (no duplicate cost). This matches the web trip-result layout and the plan's "hero total" intent.

**2. [Rule 3 — trivial] Dropped the unused `TextInput` import**
- The original file imported `TextInput` from `react-native` but never used it (the favorite modal uses the `Input` atom). Removed during the Task 1 rewrite to keep the import list clean; no behavior change.

No Rule 1/2/4 deviations — no bugs, missing critical functionality, or architectural changes were needed.

## Threat Surface Scan

No new trust boundaries. The two registered threats hold:
- **T-05-05-01 (Tampering, toll fields):** display-only; the mobile guards null (`?? 0`) and hides the toll line when absent — backend remains the computing/validating authority.
- **T-05-05-02 (Info Disclosure, precision label):** the réel/≈ estimé badge is driven solely by the backend `tollIsEstimate` flag (always estimate in practice, D-07/D-08) — honest labeling, no key/secret surfaced.

No input, network, or secrets introduced by this plan.

## Known Stubs

None. The toll fields flow from the live `POST /trips/calculate` response; the breakdown, badge, and hero all render real values (hidden, per D-04, when there is no toll).

## Self-Check: PASSED

- `mobile/app/(tabs)/dashboard.tsx` — FOUND (modified).
- Commits `db912a9` (shell + form restyle), `5dcdfb4` (toll-aware result) — FOUND.
- mobile `npx tsc --noEmit` → 0 errors (full run, EXIT=0); dashboard.tsx references `tollIsEstimate` (×4), `DataBar` (×4), `AnimatedCounter` (×3); toll line hidden via `hasToll` guard + DataBar `tollValue<=0`; calc/share/favorite flows preserved verbatim.
