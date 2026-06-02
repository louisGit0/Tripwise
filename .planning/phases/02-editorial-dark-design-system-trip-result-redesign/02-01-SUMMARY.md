---
phase: 02-editorial-dark-design-system-trip-result-redesign
plan: 01
subsystem: web-design-system
tags: [design-tokens, typography, tailwind, next-font, editorial-dark]
requires: []
provides:
  - "--c-surface3 / --c-fuel-gpl / --c-toll CSS tokens (dark + light)"
  - "refined surface + neutral ramp (AA-passing --c-muted)"
  - "--text-hero/display/body/caption size tokens"
  - "Tailwind carbon.surface3/fuelGpl/toll + font-serif + text-hero/display/body/caption + spacing aliases"
  - "Instrument Serif font (--font-serif), 2-weight font system (400/700)"
affects:
  - web/src/app/globals.css
  - web/tailwind.config.ts
  - web/src/app/layout.tsx
tech-stack:
  added:
    - "Instrument Serif (next/font/google, weight 400)"
  patterns:
    - "CSS-var-driven Tailwind utilities (single source of truth in globals.css)"
    - "Disciplined type scale: 4 sizes + 2 weights (PD-2)"
    - "Editorial serif display tier (h1/h2) paired with Space Grotesk UI + JetBrains Mono numerics"
key-files:
  created: []
  modified:
    - web/src/app/globals.css
    - web/tailwind.config.ts
    - web/src/app/layout.tsx
decisions:
  - "muted bumped #7a7163 -> #8a8173 to pass WCAG AA (~4.8:1) on small text (was ~3.9:1)"
  - "toll uses warm taupe (#b8a98c dark / #9b8a6b light), deliberately NOT an energy color, to avoid semantic collision with diesel amber"
  - "12px/20px pinned as named spacing aliases (tile-gap, card-pad) — additive only, Tailwind numeric scale untouched"
  - "Space Grotesk + JetBrains Mono trimmed to weights 400/700 (2-weight system); 500/600 dropped"
metrics:
  duration: ~10min
  tasks: 3
  files: 3
  completed: 2026-06-02
---

# Phase 2 Plan 01: Editorial-Dark Token Foundation Summary

Established the editorial-premium-dark token foundation (DES-01): evolved the Carbon dark tokens in place, added the Instrument Serif editorial display face, and exposed every new token as a Tailwind utility so all downstream Phase 2 plans and Phase 3 consume one source of truth — verified with a clean `tsc` and a green 18-route `build`.

## What Was Built

### Task 1 — `globals.css` token evolution (commit `794fe0e`)
- **Surface ramp (PD-1):** `--c-surface` `#181612`→`#17150f`, `--c-surface2` `#221e18`→`#211d16`, **new** `--c-surface3: #2a251c` (elev 3 — hero plate / modal / tooltip). `--c-faint`/`--c-hairline` unchanged.
- **Neutral text ramp:** `--c-ink` `#f0ece4`→`#f2efe8`, `--c-ink2` `#c4bdaf`→`#c9c2b4`, `--c-muted` `#7a7163`→`#8a8173` (the AA fix).
- **New semantic tokens:** `--c-fuel-gpl: #a78bfa` (GPL violet), `--c-toll: #b8a98c` (warm taupe). Accent/EV/gas/diesel unchanged.
- **Light-mode parity:** added `--c-surface3 #ece9e2`, `--c-fuel-gpl #7c3aed`, `--c-toll #9b8a6b`; `--c-muted` already `#8a8275`.
- **Type-size tokens (`:root`):** `--text-hero: clamp(64px,14vw,112px)`, `--text-display: clamp(24px,5vw,40px)`, `--text-body: 14px`, `--text-caption: 11px`.
- **Heading reset:** `h1,h2` → `var(--font-serif)`, weight 400, tracking 0, line-height 1.05 (h1) / 1.1 (h2); `h3..h6` → `var(--font-display)`, weight 700 (the 600 weight is gone). `body`, selection, scrollbar, and transition rules left untouched.

### Task 2 — Tailwind utilities (commit `ab54acf`)
- `colors.carbon`: added `surface3`, `fuelGpl`, `toll` (→ matching `--c-*` vars). All existing carbon keys kept.
- `fontFamily.serif: ['var(--font-serif)','Georgia','serif']`; `sans`/`display`/`mono` kept for back-compat.
- `fontSize`: `hero`/`display`/`body`/`caption` → the 4 `--text-*` vars (yields `text-hero`/`text-display`/`text-body`/`text-caption`).
- `spacing`: documented additive aliases `tile-gap: 12px` and `card-pad: 20px` with inline comments naming the two previously-ad-hoc values. `darkMode`/`content`/`letterSpacing`/`borderRadius`/`plugins` unchanged.

### Task 3 — next/font wiring (commit `46978a6`)
- Imported and configured `Instrument_Serif`: `weight: ['400']`, `style: ['normal','italic']`, `variable: '--font-serif'`, `display: 'swap'`, `preload: true`, fallback `['Georgia','serif']`.
- Trimmed `Space_Grotesk` and `JetBrains_Mono` `weight` arrays to exactly `['400','700']` (dropped 500/600).
- Added `${instrumentSerif.variable}` to the `<body>` className (existing display/mono variables + `font-display` kept). Metadata/viewport/icons/Providers untouched.

## Verification

| Check | Result |
|-------|--------|
| `cd web; npx tsc --noEmit` (after each task) | ✅ 0 errors |
| `cd web; npm run build` (Task 2 + Task 3) | ✅ 18/18 routes compiled |
| Instrument Serif fetched + self-hosted by next/font at build | ✅ no error |
| New tokens present in globals.css (`--c-surface3`/`--c-toll`/`--c-fuel-gpl`/`--text-hero`) | ✅ |
| New utilities present in tailwind.config.ts (`surface3`/`serif`/fontSize `hero`) | ✅ |
| `Instrument_Serif` + `--font-serif` present in layout.tsx | ✅ |

## Deviations from Plan

None — all three tasks executed exactly as written. No deviation rules (1–4) triggered; no auth gates; no architectural decisions required.

## Known Stubs

None. This plan ships token definitions and font wiring only — no UI rendering, no data sources, no placeholders.

## Watchpoints (for Phase 3 / later Phase 2 waves)

- **Dropped 500/600 weights:** 72 `font-semibold`/`font-medium` usages across 30 web files still reference weights no longer loaded for Space Grotesk. This is the deliberate consequence of the PD-2 2-weight system — the browser rounds these to the nearest loaded weight (400/700) at render time. No build break, no broken layout. Phase 3 migrates these to weight-700 emphasis or size-based hierarchy. Tracked, intentionally not fixed here (out of plan scope — visual-layer migration is Phase 3).
- **Opacity modifiers:** `bg-carbon-x/50` does NOT work on the new CSS-var colors (`surface3`/`toll`/`fuelGpl`) — for muted data-viz states use inline `style={{ opacity }}` (already documented in 02-UI-SPEC.md; relevant to the 02-03 DataBar plan).

## Self-Check: PASSED

- Commits exist: `794fe0e`, `ab54acf`, `46978a6` (all on `master`).
- Files modified verified present: `web/src/app/globals.css`, `web/tailwind.config.ts`, `web/src/app/layout.tsx`.
