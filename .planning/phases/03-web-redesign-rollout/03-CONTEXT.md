---
phase: 03-web-redesign-rollout
type: context
source: /gsd:discuss-phase (interactive, 2026-06-02)
requirements: [WEB-01, WEB-03, WEB-04]
---

# Phase 3 Context — Web Redesign Rollout

## Domain

Apply the **editorial-dark design language established in Phase 2** consistently across every
remaining web screen, with existing flows intact and Core Web Vitals preserved. Phase 2 built and
proved the system on the trip result page; Phase 3 rolls it out so the whole web app feels like one
premium product. This is the LAST web-only redesign phase before the catalog (Phase 4) and mobile
(Phase 5).

## Inherited / Locked (from Phase 2 — do NOT re-decide)

The design system already exists and is authoritative — consume it, don't reinvent:
- **Tokens** (`web/src/app/globals.css` + `web/tailwind.config.ts`): refined warm-charcoal ramp
  (`--c-bg/surface/surface2/surface3/faint/hairline`), neutral ramp (`--c-ink/ink2/muted` AA),
  accent `#4d8bff`, energy palette (`--c-ev/fuel-gas/fuel-die/fuel-gpl`), `--c-toll`, 4 fontSize
  tokens (`hero/display/body/caption`), spacing aliases.
- **Typography:** Space Grotesk (display/UI) + JetBrains Mono (numerics). **2 weights only: 400/700.**
  **D-11 — NO serif display. Titles = Space Grotesk bold 700.** Do not reintroduce Instrument Serif
  or any serif family.
- **Primitives/atoms:** `DataBar` (Variant A/B), `Skeleton`, `Pill`, `Eyebrow`, `SectionCard`,
  `KPICell`, `NumberDisplay`, `Sparkline`, `Tooltip`, `CTAButton`, `Card`, `Input`, `Select`,
  `Modal`, `SegmentedControl`, `BrandAvatar`, `FuelBadge`, `Hairline`, `StatusDot`, `CommandBar`.
- **Motion:** `useCountUp` + `useReducedMotion`; transform/opacity only; `prefers-reduced-motion`
  honored; no CLS.
- **MD-2:** visual layer only — no backend/route/data/calculation changes.

## Phase Decisions (from discuss, 2026-06-02)

- **PD3-1 — Atoms-first rollout.** FIRST normalize the shared UI atoms to the editorial-dark
  contract (weights to 400/700 — fix `CTAButton` font-medium/500 (review IN-04) and `SectionCard`
  `<h2>` font-semibold/600; consistent focus-visible ring `ring-carbon-accent/50`; token colors;
  consistent radii/spacing). THEN restyle each screen, which inherits the normalized atoms. This is
  DRY, guarantees consistency, and clears the Phase 2 review debt (IN-04/IN-05). Consider hoisting
  `useReducedMotion` to a single provider (IN-05) if cheap.
- **PD3-2 — Full scope this phase.** Restyle ALL remaining web screens in one rollout (grouped into
  waves): landing `/`; auth `/login`, `/register`, `/auth/callback/{google,apple}`; `AppLayout`
  shell (sidebar/topbar); `/app/dashboard`; `/app/garage`, `/app/garage/[id]`, `/app/garage/add`;
  `/app/trips`, `/app/trips/[id]`; `/app/favorites`; `/app/fuel-prices`; `/app/settings`. Completes
  WEB-01. (`/app/trips/result` already done in Phase 2 — leave it, but reuse its patterns.)
- **PD3-3 — Dashboard (WEB-03): emphatic data-viz.** Redesign the dashboard around a hero calc
  entry + KPIs presented as designed data-viz (NumberDisplay + DataBar/Sparkline) with measured
  micro-interactions, consistent with the trip result page. Not just a token swap. Keep the exact
  calculation/entry behavior (MD-2).

## Scope Fence

**In:** atom normalization to the contract; restyle of every listed screen in the editorial-dark
language; the dashboard data-viz redesign; consistent interaction states + loading skeletons across
screens; CWV preservation (no layout shift, transform/opacity motion); reduced-motion.

**Out:** backend/route/data/calculation changes (MD-2); the trip result page (Phase 2 — done);
the showroom's CLIENT-LOAD-ALL scaling problem (`garage/add` loads all models — that's CAT-06 /
**Phase 4** server-side search; Phase 3 only restyles the existing showroom UI, does NOT change its
data-loading); the vehicle catalog expansion (Phase 4); mobile (Phase 5); new features; new fonts
or a serif display (D-11).

## Success Criteria (from ROADMAP)

1. Landing, dashboard, garage, showroom, trips/history, favorites, fuel-prices, settings, and auth
   screens are all restyled in the editorial-dark direction with existing flows preserved.
2. The dashboard (calc entry + KPIs) is redesigned in the new language with the same calculation
   behavior.
3. Navigating between any two restyled screens feels visually consistent — shared surfaces,
   typography, and interaction states.
4. Restyled pages meet CWV targets: no new layout shift; animations on transform/opacity only.

## Open Questions For UI-SPEC / Planning

- The per-screen application spec for each surface (landing hero, auth cards, AppLayout shell,
  dashboard KPI data-viz, garage cards + BrandAvatar/FuelBadge, trips history list + detail,
  favorites, fuel-prices form, settings) — composition + which primitives each uses, staying in the
  locked language.
- Which atoms need weight/focus/token normalization and the exact diffs (grep `font-medium`,
  `font-semibold`, ad-hoc colors across `web/src`).
- Wave grouping for parallel-safe execution (atoms wave first; then screen clusters with no shared
  file overlap).
- A consistency checklist for criterion 3 (shared surfaces/typography/interaction states) and a CWV
  guard for criterion 4.
