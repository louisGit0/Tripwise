---
phase: 02-editorial-dark-design-system-trip-result-redesign
plan: 02
subsystem: web
tags: [hooks, motion, accessibility, reduced-motion, animation]
requirements: [DES-04]
dependency_graph:
  requires: []
  provides:
    - "useReducedMotion — SSR-safe prefers-reduced-motion subscription hook"
    - "useCountUp — rAF easeOutCubic count-up hook with reduced-motion gate"
  affects:
    - "02-03 (data-viz primitives — reuse useReducedMotion for bar reveal gate)"
    - "02-04 (result-page redesign — hero counter via useCountUp)"
tech_stack:
  added: []
  patterns:
    - "matchMedia subscription via useState(false) SSR-safe default + useEffect change listener with cleanup"
    - "requestAnimationFrame easeOutCubic loop keyed on [target, durationMs, reducedMotion] with cancelAnimationFrame cleanup"
key_files:
  created:
    - web/src/hooks/useReducedMotion.ts
    - web/src/hooks/useCountUp.ts
  modified: []
decisions:
  - "Mirrored useDebounce.ts convention (named export, no 'use client' directive — hooks are SSR-safe by design, browser APIs only touched inside effects)"
  - "useCountUp short-circuits to target when reducedMotion OR durationMs <= 0 (single render path, no rAF scheduled)"
  - "Effect keyed on reducedMotion so a runtime preference flip re-resolves the value correctly"
metrics:
  duration: ~4min
  completed: 2026-06-02
  tasks: 2
  files: 2
---

# Phase 2 Plan 02: Motion Hooks (useReducedMotion + useCountUp) Summary

SSR-safe `useReducedMotion` matchMedia gate plus a `useCountUp` requestAnimationFrame easeOutCubic counter (0→target over 700ms, instant under reduced motion) — the reusable DES-04 motion infrastructure the result-page hero figure and data-viz bars consume.

## What Was Built

### Task 1 — `useReducedMotion` (commit 92ed137)
- `web/src/hooks/useReducedMotion.ts` — named export returning `boolean`.
- `useState(false)` as the SSR-safe default (no `window` access during render → no hydration mismatch).
- `useEffect` reads `window.matchMedia('(prefers-reduced-motion: reduce)')`, seeds state with `.matches`, subscribes to the `change` event, and removes the listener on cleanup.
- Guards against `window` / `matchMedia` being undefined (server / unsupported environments).

### Task 2 — `useCountUp` (commit 538c3a9)
- `web/src/hooks/useCountUp.ts` — named export `useCountUp(target, durationMs = 700): number`.
- Imports `useReducedMotion`; when reduce is set (or `durationMs <= 0`), sets state to `target` directly — no rAF loop.
- Otherwise drives a `requestAnimationFrame` loop: `t = min(elapsed/durationMs, 1)`, `easeOutCubic(t) = 1 - (1-t)^3`, `value = target * eased`, snapping to the exact `target` at `t === 1`.
- Effect keyed on `[target, durationMs, reducedMotion]` so the animation restarts from 0 on target change; stores the rAF id and `cancelAnimationFrame`s it in cleanup (no leaked frames).
- Returns the raw numeric value — formatting (decimals/locale, tabular-nums) is the caller's job per UI-SPEC.

## Verification

| Check | Result |
|-------|--------|
| `web npx tsc --noEmit` | PASS (0 errors) |
| `web npm run build` | PASS (18/18 routes compiled) |
| Grep `useCountUp.ts` → requestAnimationFrame / useReducedMotion / cancelAnimationFrame / easeOutCubic | 9 occurrences |
| Grep `useReducedMotion.ts` → prefers-reduced-motion / addEventListener | 3 occurrences |
| No `console.log` in new files | PASS |

Behavioral assertions (0→target animation, instant reduced-motion fallback) are confirmed at result-page integration in 02-04 per the plan's success criteria — web has no test runner, and the plan's `<verify>` blocks specify tsc/build only.

## Deviations from Plan

None — plan executed exactly as written.

The two tasks carry `tdd="true"`, but the web sub-project has no test framework (confirmed in CLAUDE.md and the plan's `<verify>` blocks, which specify `tsc --noEmit` / `npm run build` only). Standing up a test runner for two pure hooks would be an unrequested architectural change (Rule 4); both hooks were implemented to the behavioral spec and verified via the plan's stated tsc/build gates.

## Notes for Downstream Plans

- 02-04 hero figure: render `useCountUp(total)` into a JetBrains Mono `tabular-nums` span with fixed 2 decimals (zero CLS); mark the animating span `aria-hidden` and pair it with an `sr-only` sibling carrying the final formatted total (no `aria-live`).
- 02-03 DataBar / Skeleton: gate the `scaleX` fill reveal and the skeleton pulse on `useReducedMotion()` (render at final state when reduce is set).

## Self-Check: PASSED
- FOUND: web/src/hooks/useReducedMotion.ts
- FOUND: web/src/hooks/useCountUp.ts
- FOUND commit: 92ed137 (useReducedMotion)
- FOUND commit: 538c3a9 (useCountUp)
