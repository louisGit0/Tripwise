---
phase: 03-web-redesign-rollout
plan: 01
subsystem: web-ui
tags: [design-system, atoms, typography, focus, accessibility, app-layout]
requires: []
provides:
  - "Normalized ui/ atoms (2-weight 400/700, canonical accent focus ring, correct accent color)"
  - "Restyled AppLayout shell (700 inline CTA, canonical focus on shell controls)"
affects:
  - "All Phase 3 screens import these atoms + AppLayout — they inherit the corrected vocabulary unchanged"
tech-stack:
  added: []
  patterns:
    - "Canonical focus token: focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg"
    - "2-weight typography: emphasis -> font-bold (700); body/labels/units/deltas/segments -> font-normal (400)"
key-files:
  created: []
  modified:
    - web/src/components/ui/CTAButton.tsx
    - web/src/components/ui/SectionCard.tsx
    - web/src/components/ui/Modal.tsx
    - web/src/components/ui/Input.tsx
    - web/src/components/ui/Select.tsx
    - web/src/components/ui/Eyebrow.tsx
    - web/src/components/ui/KPICell.tsx
    - web/src/components/ui/FuelBadge.tsx
    - web/src/components/ui/Pill.tsx
    - web/src/components/ui/NumberDisplay.tsx
    - web/src/components/ui/SegmentedControl.tsx
    - web/src/components/ui/Wordmark.tsx
    - web/src/components/ui/BrandAvatar.tsx
    - web/src/components/layouts/AppLayout.tsx
decisions:
  - "IN-05 useReducedMotion provider hoist deferred — discretionary, risk-gated; per-component hook already correct, provider refactor is outside MD-2 visual-only scope"
  - "Added aria-label='Nouveau trajet' to the AppLayout CTA (icon-only at xs breakpoint) — Rule 2 accessibility correctness"
metrics:
  duration: ~9min
  completed: 2026-06-02
  tasks: 2
  files: 14
---

# Phase 3 Plan 01: Atom + Shell Normalization Summary

Normalized all 13 shared `ui/` atoms and the `AppLayout` shell to the locked editorial-dark contract — the 2-weight (400/700) typography system, the single canonical accent focus-visible ring, and the one accent-color-correctness fix (`ring-blue-500` `#3b82f6` → `ring-carbon-accent` `#4d8bff`) — API-stable (className-only, MD-2), so every Phase 3 screen inherits one consistent component vocabulary.

## What Was Built

**Task 1 — `ui/` atom normalization (commit `79b6d07`)**
- Emphasis weights → `font-bold` (700): CTAButton shared label, SectionCard `<h2>`, Modal `<h2>`, Input/Select labels, Eyebrow, KPICell label, FuelBadge, Pill, Wordmark sm/md, BrandAvatar.
- De-emphasized weights → `font-normal` (400): KPICell unit + delta, NumberDisplay default, SegmentedControl segment (active/inactive stay color/bg-only — no weight change, no CWV reflow).
- CTAButton accent/surface/ghost focus rings `ring-blue-500/*` → `ring-carbon-accent/50` (accent-color correctness); danger keeps `ring-red-500/40`. Stale `≈ blue-500` comment corrected to `--c-accent #4d8bff`.
- Input/Select `focus:ring-2 focus:ring-carbon-accent focus:ring-offset-0` → canonical `focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg` (error-state `focus:ring-red-400` branch + `focus:border-carbon-accent` kept).
- KPICell value sizes (already `font-bold`) untouched; the 9 already-compliant atoms (DataBar, Skeleton, Sparkline, Tooltip, StatusDot, Hairline, Card, TWAppIcon, CommandBar) were not edited and verified to stay clean.

**Task 2 — AppLayout shell (commit `4cf06b4`)**
- `+ Nouveau trajet` CTA `font-semibold` → `font-bold` (700), `font-mono` retained.
- Canonical accent focus ring added to the 4 shell controls: `+ Nouveau trajet` CTA, mobile burger, sidebar collapse toggle, drawer-close `X`.
- `aria-label="Nouveau trajet"` added to the CTA (icon-only at the xs breakpoint); existing burger/collapse/close aria-labels kept intact.
- Active `SidebarItem` `bg-blue-500/10 text-carbon-accent` tint, sidebar widths, breadcrumb mono styling, and StatusDot all left unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing accessibility] aria-label on the icon-only `+ Nouveau trajet` CTA**
- **Found during:** Task 2
- **Issue:** At the `xs` breakpoint the CTA label is `hidden sm:inline`, leaving an icon-only button (Plus icon is `aria-hidden`) with no accessible name. The plan's objective explicitly requires aria-label on icon-only AppLayout buttons.
- **Fix:** Added `aria-label="Nouveau trajet"`.
- **Files modified:** web/src/components/layouts/AppLayout.tsx
- **Commit:** 4cf06b4

### Deferred (discretionary)

- **IN-05 `useReducedMotion` provider hoist — deferred.** The per-component `matchMedia` hook already works correctly (SSR-safe, live updates) across its 3 callers (result page, DataBar, Skeleton). A `ReducedMotionProvider` + context is an architectural change outside this plan's MD-2 visual-only scope, and the plan flags it "skip if it adds any risk or scope." `useReducedMotion.ts` and `Providers.tsx` were left untouched.

## Verification

| Check | Result |
|-------|--------|
| `cd web; npx tsc --noEmit` | clean (0 errors) |
| `cd web; npm run build` | 18/18 routes, 0 ESLint errors |
| grep `font-medium\|font-semibold\|font-extrabold` over `web/src/components/ui/` + AppLayout.tsx | 0 matches |
| grep `ring-blue-500` over `web/src/components/ui/` + AppLayout.tsx | 0 matches |
| grep `focus:ring-offset-0` over `web/src/components/ui/` | 0 matches |
| CTAButton accent/surface/ghost ring | `ring-carbon-accent/50`; danger `ring-red-500/40` |
| Active SidebarItem tint | `bg-blue-500/10 text-carbon-accent` (kept) |
| Serif (D-11) | none introduced; titles remain Space Grotesk 700 |
| API stability | no prop/type/export renamed in any atom |

## Self-Check: PASSED

- web/src/components/ui/CTAButton.tsx — FOUND
- web/src/components/layouts/AppLayout.tsx — FOUND
- commit 79b6d07 — FOUND
- commit 4cf06b4 — FOUND
