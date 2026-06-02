---
phase: 02-editorial-dark-design-system-trip-result-redesign
type: context
source: /gsd:discuss-phase (interactive, 2026-06-02)
requirements: [DES-01, DES-02, DES-03, DES-04, WEB-02]
---

# Phase 2 Context — Editorial Dark Design System + Trip Result Redesign

## Domain

Build a documented "editorial premium dark" design language as reusable tokens +
data-viz primitives, and prove it on the highest-value screen — the **trip result
page** (`web/src/app/app/trips/result/page.tsx`) — with designed cost/energy/toll
data-viz and measured micro-interactions. Phase 3 later rolls this language across
all remaining screens; Phase 2 establishes + proves the system.

This is an **evolution of the existing Carbon dark system**, not a rewrite. Current
state (web/src/app/globals.css + tailwind.config.ts): warm-charcoal dark by default
(`--c-bg #0e0c0a`, warm ink `#f0ece4`, surfaces `#181612`/`#221e18`, hairline
`#3a3328`), blue accent `--c-accent #4d8bff`, energy colors (EV blue `#4d8bff`, gas
orange `#ff7849`, diesel amber `#ffc247`), fonts Space Grotesk (display) + JetBrains
Mono (numerics), `next-themes` data-theme dark/light, existing UI atoms in
`web/src/components/ui/` (Pill, CTAButton, SectionCard, KPICell, Tooltip, etc.).

## Locked Decisions (milestone-level, carried in)

- **MD-1 — Editorial premium dark, dark-first.** Evolve the Carbon identity toward a
  Linear/Vercel-grade premium feel. Do NOT default to a new theme; dark stays default,
  light stays a derived (already-existing) mode.
- **MD-2 — Preserve architecture, restyle the visual layer only.** No flow/route/data
  changes. Same calculation behavior. Lower risk.
- **MD-3 — Measured micro-interactions, not heavy animation.** Compositor-friendly
  only (transform/opacity), within CWV budgets.
- **MD-4 — Tokens are the deliverable (DES-01).** The design language must exist as
  documented, reusable tokens + primitives a developer can apply to any screen
  (Phase 3 consumes them).

## Phase Decisions (from discuss, 2026-06-02)

- **PD-1 — Palette: refine the existing, don't replace.** Keep the warm-charcoal dark
  base + blue accent `#4d8bff`. Refine the surface elevation levels, contrast, and the
  neutral ramp for a more premium/editorial feel. Energy colors (EV/gas/diesel) stay
  as the semantic data-viz palette. (Chose "Affiner l'existant" over a new signature
  accent or near-monochrome.)
- **PD-2 — Typography: add an editorial display face.** Introduce a distinctive display
  typeface for headings/hero (a marked grotesque or an editorial serif — researcher to
  recommend a performant, well-licensed option, ideally `next/font`-friendly), keep
  **JetBrains Mono** for numeric figures. Space Grotesk may be retained for UI/body or
  demoted — researcher/planner to decide based on pairing quality. Respect the perf
  budget: max ~2 active families + the mono; `font-display: swap`; preload only the
  critical weight.
  - **REVISED (D-11, 2026-06-02, post-checkpoint):** The serif display face (Instrument Serif) was implemented and reviewed live — the user preferred the previous font. The editorial serif is DROPPED; titles/headings use **Space Grotesk bold (700)**. JetBrains Mono kept for numerics. The editorial character comes from the refined palette + 4-size/2-weight scale + data-viz + motion, not a new font. **Phase 3 must NOT reintroduce a serif display.**
- **PD-3 — Trip-result layout: hero + breakdown bars (DES-02, WEB-02).** Total cost as
  a designed hero figure, then horizontal breakdown bars (Énergie vs Péage) and
  multi-energy comparison bars (the existing `calculate-multi` data — gas/diesel/EV).
  Bars are part of the design system (a reusable data-viz primitive), not ad-hoc.
- **PD-4 — Motion: animated counter + light staggered reveal (DES-04).** Animate the
  hero cost with a counter, a subtle staggered reveal of the breakdown bars, and
  designed hover/focus/press states (DES-03) + loading skeletons. All transform/opacity,
  respect `prefers-reduced-motion`.

## Scope Fence

**In:** documented editorial-dark token system (typography scale, color, spacing
rhythm, surfaces, the data-viz bar primitive) as reusable tokens/components; refined
palette/surfaces; the editorial display font wiring; redesign of the **trip result
page** around hero cost + energy/toll breakdown bars + multi-energy comparison;
designed interaction states + loading skeletons; the animated counter + staggered
reveal; reduced-motion + CWV compliance.

**Out:** restyling other screens (Phase 3, WEB-01/03); backend/route/data changes
(MD-2); the showroom/catalog (Phase 4); mobile (Phase 5); new features; precise tolls.

## Success Criteria (from ROADMAP)

1. A documented design language (type scale, color, spacing rhythm, surfaces, data-viz
   primitives) exists as reusable tokens/components applicable to any screen.
2. The trip result page presents total cost as a designed hero figure with a clear
   energy + toll breakdown and multi-energy comparison — not plain text rows.
3. Interactive elements on the result page show designed hover/focus/press states and
   loading skeletons while data resolves.
4. The total cost animates with a smooth compositor-friendly counter/transition within
   performance budget (no jank, transform/opacity only).

## Open Questions For Research / UI-SPEC

- Recommend the editorial display typeface (performant, `next/font` Google or
  self-hosted, license-clean) that pairs well with JetBrains Mono and the warm-charcoal
  palette; define the type scale (hero → caption) and weights to preload.
- Define the refined surface-elevation ramp + spacing rhythm tokens (the current
  `--c-surface`/`--c-surface2`/`--c-faint`/`--c-hairline` evolved into a documented set).
- Specify the reusable breakdown/comparison **bar primitive** (token-driven colors via
  the energy palette, sizing, label/value layout, reduced-motion behavior).
- Where the tokens live so Phase 3 + (eventually) mobile can consume one source of
  truth (globals.css + tailwind.config.ts on web; note the RN-StyleSheet mirror for
  Phase 5 without committing to it here).
- The counter + staggered-reveal technique within CWV (no layout shift; transform/opacity).
