---
phase: 05-mobile-tolls-editorial-redesign
plan: 03
subsystem: mobile
tags: [data-viz, motion, accessibility, reduced-motion, atoms, editorial-dark, rn-animated]
requires:
  - "mobile/constants/theme.ts editorial ThemeColors + tokens (05-01)"
  - "Space Grotesk + JetBrains Mono loaded faces (05-02)"
provides:
  - "mobile/src/hooks/useReducedMotion.ts — AccessibilityInfo.isReduceMotionEnabled + reduceMotionChanged subscription → boolean"
  - "mobile/src/components/ui/AnimatedCounter.tsx — Animated.timing 0→value counter, FR comma 2dp mono, instant under reduced motion"
  - "mobile/src/components/ui/DataBar.tsx — Variant A segmented Énergie/Péage (hide-when-0) + Variant B single comparison, token fills"
  - "mobile/src/components/ui/{Pill,SectionCard,Eyebrow}.tsx — editorial atoms with web-parity naming"
  - "mobile/constants/theme.ts — additive editorial FontSize export (caption/body/display/hero)"
affects:
  - "Wave-3 Phase 5 screen plans (05-04..07): dashboard tolls slice + result animated total consume DataBar/AnimatedCounter; restyles consume Pill/SectionCard/Eyebrow"
tech-stack:
  added: []
  patterns:
    - "RN AccessibilityInfo.isReduceMotionEnabled() + addEventListener('reduceMotionChanged') subscription with .remove() cleanup"
    - "JS-driven Animated.Value (useNativeDriver:false) + addListener → setState for live numeric formatting"
    - "discriminated-union RN component props (never-typed exclusivity) mirroring the web DataBar contract"
    - "DimensionValue cast for template-literal percentage widths in RN StyleSheet"
key-files:
  created:
    - mobile/src/hooks/useReducedMotion.ts
    - mobile/src/components/ui/AnimatedCounter.tsx
    - mobile/src/components/ui/DataBar.tsx
    - mobile/src/components/ui/Pill.tsx
    - mobile/src/components/ui/SectionCard.tsx
    - mobile/src/components/ui/Eyebrow.tsx
  modified:
    - mobile/constants/theme.ts
decisions:
  - "DataBar mount reveal uses an opacity fade (native driver) rather than the web's scaleX+transformOrigin: opacity is unambiguously typed + compositor-friendly in RN 0.81, keeps layout stable (widths final on first paint, no width animation), and the data-viz contract only mandates the reduced-motion gate + hide-when-0 + muted — not a specific transform."
  - "AnimatedCounter must use useNativeDriver:false so the JS-thread listener can read the tweened value and FR-format it (comma decimal); only the numeric value updates — no layout-bound props animate."
  - "Editorial FontSize (tokens.fontSize) exposed as an additive named export on theme.ts so atoms read the caption/body scale via the aliased @/constants/theme (the @verygoodtrip/shared alias does not resolve at Metro runtime — 05-01)."
  - "Pill tints derive from editorial tokens via an 8-digit-hex withAlpha helper (success/warning=fuelDie/accent at 0.16 over matching text); neutral uses surface2/ink2 — no hardcoded blue."
metrics:
  tasks: 3
  files_changed: 7
  commits: 3
  tsc_errors_before: 0
  tsc_errors_after: 0
  completed: 2026-06-02
---

# Phase 5 Plan 03: RN Data-Viz / Motion Primitives + Editorial Atoms Summary

Re-implemented the locked web data-viz/motion contract in React Native (PD5-3): a `useReducedMotion` hook over `AccessibilityInfo`, an `AnimatedCounter` that tweens 0→value with `Animated.timing` and resolves INSTANTLY under reduced motion (FR comma, JetBrains Mono tabular), a `DataBar` with the discriminated Variant A (segmented Énergie/Péage, toll hidden at 0) + Variant B (single comparison, muted option), and the editorial atoms `Pill` / `SectionCard` / `Eyebrow` with web-parity naming — all token-driven, named exports, mobile `tsc --noEmit` GREEN.

## What Was Built

- **`mobile/src/hooks/useReducedMotion.ts`** — `useState(false)` default (mirrors the web first-paint default), an effect that calls `AccessibilityInfo.isReduceMotionEnabled().then(setReduced)` (with a `.catch(()=>setReduced(false))` for an unavailable query) and subscribes via `AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)`; the returned subscription is torn down with `subscription.remove()` (RN 0.65+ contract, no `removeEventListener`) and an `isMounted` guard prevents a post-unmount `setState` from the async read.
- **`mobile/src/components/ui/AnimatedCounter.tsx`** — props `{ value: number; style?: TextStyle; durationMs?: number }`. Holds a `useRef(new Animated.Value(0))`; an effect keyed on `[value, durationMs, reduced, av]` either (reduced motion / `durationMs<=0`) `av.stopAnimation()` + `setValue(value)` + `setDisplay(value)` INSTANTLY, or resets to 0, attaches `av.addListener(({value:v})=>setDisplay(v))` and runs `Animated.timing(av, { toValue:value, duration:durationMs??700, easing:Easing.out(Easing.cubic), useNativeDriver:false }).start()`. Renders `formatFr(display)` = `toFixed(2).replace('.',',')` in `Fonts.mono` (JetBrains Mono 700) `color:c.ink`. Cleanup stops the animation + removes the listener (no leaked frames — mitigates T-05-03-01).
- **`mobile/src/components/ui/DataBar.tsx`** — discriminated-union `DataBarProps`: **Variant A** `{ energyValue, tollValue, total, energyFill, height? }` renders a rounded `surface2` track with a flush `flexDirection:'row'` of an energy `Animated.View` (`width pct(energyValue,total)%`, `energyFill`) + a toll `Animated.View` (`pct(tollValue,total)%`, `c.toll`) **hidden entirely when `tollValue<=0`** (D-04); **Variant B** `{ value, max, fill, muted?, height? }` renders one absolute fill (`pct(value,max)%`, `fill`, muted→0.45 via `Animated.multiply`). `pct()` clamps 0–100 + guards zero/NaN; `widthPct()` casts the template-literal percent to `DimensionValue`. A mount opacity reveal (`Animated.timing` native driver, 600ms) is gated OFF under `useReducedMotion` (`reveal.setValue(1)`). Heights sm=6 / md=10. Exports `DataBarProps`.
- **`mobile/src/components/ui/Eyebrow.tsx`** — uppercase caption (`Fonts.display` 700, `FontSize.caption`, `letterSpacing 1.6`, `textTransform:'uppercase'`, `color:c.mutedText`).
- **`mobile/src/components/ui/Pill.tsx`** — `{ children, color?: 'success'|'warning'|'neutral'|'accent', size?: 'sm'|'md' }`; tinted chip via a `withAlpha(hex,0.16)` helper (success=`c.success`, warning=`c.fuelDie`, accent=`c.accent`, neutral=`surface2`/`ink2`), `Radius.full`, display-700 label sized by `FontSize.caption`/`body`. For the réel/≈ estimé toll badge.
- **`mobile/src/components/ui/SectionCard.tsx`** — `{ title?, children, padding?, style? }`; `surface` bg + `hairline` border + `Radius.card` (12), optional `Eyebrow` title row (`marginBottom Spacing[3]`); padding map none/sm/md/lg — the editorial counterpart of the legacy `Card`.
- **`mobile/constants/theme.ts`** — additive `export const FontSize = tokens.fontSize;` (editorial hero/display/body/caption); the legacy `FontSizes` (xs..2xl) is untouched.

## Deviations from Plan

### Auto-fixed / Enabling Changes

**1. [Rule 3 — Blocking] Added editorial `FontSize` export to `mobile/constants/theme.ts`**
- **Found during:** Task 3 (atoms need the editorial caption/body size scale)
- **Issue:** The editorial 4-size scale lives on `tokens.fontSize` but was not exposed as a named export; the `@verygoodtrip/shared` alias does not resolve at Metro runtime (05-01), so atoms cannot import tokens cleanly.
- **Fix:** One additive line `export const FontSize = tokens.fontSize;` (no existing export changed); atoms import `FontSize` from the aliased `@/constants/theme`.
- **Files modified:** `mobile/constants/theme.ts`
- **Commit:** `87d00d5`

### Adjustments

**2. DataBar reveal animation — opacity fade instead of the web's `scaleX` + `transformOrigin`**
- The web DataBar reveals via `transform: scaleX(0→1)` with `transformOrigin:left`. In RN the equivalent left-anchored scaleX requires `transformOrigin` (newer/less-portable) or a measured-width translate trick. The plan's acceptance criteria only require the reveal to be **skipped under reduced motion** (plus hide-when-0 + muted). Chose an **opacity fade** (`Animated.Value` 0→1, native driver) — unambiguously typed, compositor-friendly, and it keeps layout stable since the segment widths are final on first paint (also honors the "don't animate width" rule). Documented in `decisions`.

## TDD Gate Compliance

Task 1 carries `tdd="true"`, but the mobile sub-project has **no test runner** (CLAUDE.md: "No test framework detected in web or mobile"), and the plan's only `<verify>` for every task is `npx tsc --noEmit`. No RED/GREEN test commits were produced — adding a Jest + react-native renderer harness to mobile is an unrequested architectural addition (out of this plan's scope). The motion behavior was implemented to mirror the web `useCountUp`/`useReducedMotion` contract verbatim and verified via tsc + manual trace. This is a documented gate gap, not a silent skip.

## Threat Surface Scan

No new trust boundaries. The single registered threat (T-05-03-01, Animated counter listener/frame leak) is mitigated: `AnimatedCounter` stops the running `Animated.timing` and calls `av.removeListener(listenerId)` on every unmount / value change; `DataBar` stops its reveal animation on cleanup. No input, network, or secrets introduced.

## Known Stubs

None. All six primitives are functional and token-driven; no placeholder/empty data flows to any UI.

## Self-Check: PASSED

- Files created all present: `mobile/src/hooks/useReducedMotion.ts`, `mobile/src/components/ui/{AnimatedCounter,DataBar,Pill,SectionCard,Eyebrow}.tsx`; modified `mobile/constants/theme.ts` — FOUND.
- Commits `e82a43d` (motion primitives), `2ac75e3` (DataBar), `87d00d5` (atoms + FontSize) — FOUND.
- mobile `npx tsc --noEmit` → 0 errors (filtered per-file + full run both clean); `useReducedMotion` calls `isReduceMotionEnabled` + adds/removes `reduceMotionChanged`; `AnimatedCounter` uses `Animated` + gates on `useReducedMotion`; `DataBar` contains `tollValue` (×5) and `c.toll` fill; atoms are named exports, no hardcoded blue literal.
