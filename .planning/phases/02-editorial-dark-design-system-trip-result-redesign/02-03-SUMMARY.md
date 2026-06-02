---
phase: 02-editorial-dark-design-system-trip-result-redesign
plan: 03
subsystem: web/ui (data-viz primitives)
tags: [design-system, data-viz, motion, reduced-motion, web]
requires:
  - "web/src/hooks/useReducedMotion.ts (02-02)"
  - "globals.css energy/toll tokens --c-ev|--c-fuel-gas|--c-fuel-die|--c-fuel-gpl|--c-toll (02-01)"
  - "tailwind carbon.surface2 utility (02-01)"
provides:
  - "DataBar — token-driven data-viz bar primitive (Variant A segmented Énergie/Péage + Variant B single comparison)"
  - "Skeleton — compositor-friendly, reduced-motion-aware loading atom"
affects:
  - "02-04 result-page redesign (consumes both primitives)"
  - "Phase 3 shared data-viz vocabulary"
tech-stack:
  added: []
  patterns:
    - "scaleX(0→1) reveal via mounted-flag effect + CSS transition (compositor-friendly, no reflow)"
    - "CSS-var fills via inline style (never Tailwind opacity modifier on var colors)"
    - "discriminated-union props with `never` guards for two variants in one component"
key-files:
  created:
    - "web/src/components/ui/DataBar.tsx"
    - "web/src/components/ui/Skeleton.tsx"
  modified: []
decisions:
  - "Variant A is domain-specific (energyValue/tollValue/total/energyFillVar) rather than a generic segments array — toll segment hard-codes var(--c-toll) internally and is hidden when tollValue === 0, matching UI-SPEC + D-04 hide-when-0 and satisfying the token-link gate (literal var(--c-toll) in the file)."
  - "Reveal uses a mounted-flag useEffect: first paint scaleX(0), post-mount flip to scaleX(1) so the 600ms cubic-bezier transition fires; reduced motion short-circuits to scaleX(1) with transition:none."
  - "pct() clamps to 0–100 and guards against zero/NaN totals so trusted-but-degenerate inputs never produce invalid widths."
metrics:
  duration: ~9min
  completed: 2026-06-02
---

# Phase 2 Plan 03: Data-Viz Bar Primitive + Skeleton Atom Summary

Two net-new token-driven, reduced-motion-aware presentational primitives that unblock the 02-04 result-page redesign: a reusable `DataBar` (Variant A segmented Énergie/Péage breakdown + Variant B single comparison bar, energy fills from CSS vars, scaleX reveal) and a compositor-friendly `Skeleton` loading atom.

## What Was Built

### Task 1 — `DataBar` (commits 1cc5c56 + ac1e281)
- **Variant A (segmented)**: one `bg-carbon-surface2` track, energy segment sized `energyValue/total` (color = passed `energyFillVar`), flush toll segment sized `tollValue/total` (color = internal `var(--c-toll)`). Toll segment hidden entirely when `tollValue === 0` → single full-width energy bar (D-04).
- **Variant B (single)**: absolutely-positioned fill, width `value/max`, `muted` rows at inline `opacity: 0.45`, current at `1`. Fill color from caller's `fillVar` CSS-var string.
- **Heights**: `sm` = `h-1.5` (6px), `md` = `h-2.5` (10px, default). Track `rounded-full overflow-hidden`.
- **Reveal**: `transform: scaleX(0→1)`, `transform-origin: left`, 600ms `cubic-bezier(0.16,1,0.3,1)`; reduced motion → `scaleX(1)` with `transition: none`.
- Colors come exclusively from CSS vars via inline `style` — zero `bg-emerald/sky/violet/amber` classes.

### Task 2 — `Skeleton` (commit e3faccb)
- `bg-carbon-surface2` block, `rounded` (overridable), opacity-based `animate-pulse`.
- Props: `width`/`height` (number→px or string passthrough), `rounded`, `className`.
- Drops `animate-pulse` under reduced motion (static block). `aria-hidden`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Spec conformance] DataBar Variant A redesigned from generic `segments[]` to domain Énergie/Péage API**
- **Found during:** post-Task-1 verification (plan's grep gate requires literal `var(--c-toll)` in `DataBar.tsx`; key_link pattern `var\(--c-(ev|toll|fuel)`).
- **Issue:** Initial generic `segments: { value, fillVar }[]` API pushed the toll color to the caller, so the file did not literally contain `var(--c-toll)` and did not implement the spec's hide-when-0 toll behavior inside the primitive.
- **Fix:** Variant A now takes `energyValue`/`tollValue`/`total`/`energyFillVar`; toll segment hard-codes `var(--c-toll)` and is hidden when `tollValue === 0`. Matches UI-SPEC "Variant A" exactly and the success-criteria phrasing "segmented Énergie/Péage, hide-when-0 segments".
- **Files modified:** web/src/components/ui/DataBar.tsx
- **Commit:** ac1e281

## Verification

| Check | Result |
|-------|--------|
| `cd web; npx tsc --noEmit` | clean (0 errors) |
| `cd web; npm run build` | green — 18/18 routes |
| Grep DataBar.tsx contains `scaleX` / `var(--c-toll)` / `useReducedMotion` | yes (2 / 2 / 2) |
| Grep DataBar.tsx contains `bg-(emerald\|sky\|violet\|amber)` | 0 (none) |
| Grep Skeleton.tsx contains `animate-pulse` / `bg-carbon-surface2` | yes (2 / 2) |

## Notes for 02-04 (consumer)
- Variant A: pass `energyValue`, `tollValue`, `total`, `energyFillVar` (pick by trip energy type: `var(--c-ev)`/`var(--c-fuel-gas)`/`var(--c-fuel-die)`/`var(--c-fuel-gpl)`). The Énergie/Péage legend + réel/≈ estimé Pill/Tooltip remain caller-side (per UI-SPEC); DataBar only hides the toll *segment* when 0.
- Variant B: one `DataBar` per `EnergyComparison`, `value=totalCost`, `max=maxCost`, `fillVar` by `category`, `muted={!isCurrent}`. Row label + EUR figure + `← actuel` marker + sub-caption stay caller-side.
- Skeleton: build the result-page skeleton tree (header line, hero plate + 2×2 tiles, breakdown bar + legend lines, 3–4 comparison rows, 2 CTA buttons) per UI-SPEC "Loading Skeletons".

## Self-Check: PASSED
- FOUND: web/src/components/ui/DataBar.tsx
- FOUND: web/src/components/ui/Skeleton.tsx
- FOUND commit 1cc5c56 (DataBar initial)
- FOUND commit e3faccb (Skeleton)
- FOUND commit ac1e281 (DataBar Variant A refactor)
