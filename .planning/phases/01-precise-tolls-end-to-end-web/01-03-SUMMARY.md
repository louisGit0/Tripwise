---
phase: 01-precise-tolls-end-to-end-web
plan: 03
subsystem: web / trip result + detail
tags: [tolls, web, ui, carbon, tooltip, badge]
requires:
  - "TripResult.tollCost + tollIsEstimate from POST /trips/calculate (plan 01-01)"
  - "Persisted toll_is_estimate + GET /trips/:id returns tollIsEstimate (plan 01-02)"
provides:
  - "Tooltip UI atom (hover + focus + tap, Carbon tokens)"
  - "SavedTrip.tollIsEstimate web type"
  - "Result page: hide-when-0 péages line + réel/≈ estimé Pill + Tooltip, total-inclusive"
  - "Saved-trip detail: same réel/≈ estimé badge from persisted flag"
  - "Save payload now sends tollIsEstimate (persists the source flag)"
affects:
  - "Trip result + detail pages are the user-facing end of the toll vertical slice (TOLL-04)"
  - "Future phase 2 trip-result redesign reuses the Tooltip atom + badge pattern"
tech-stack:
  added: []
  patterns:
    - "Lightweight 'use client' Tooltip: group-hover + group-focus-within + tap-toggle state, Carbon-token surface"
    - "metrics array .filter(Boolean) for grid reflow / hide-when-0 (D-04)"
    - "Pill color success(réel)/warning(≈ estimé) driven by tollIsEstimate (D-01) wrapped in Tooltip (D-02)"
key-files:
  created:
    - web/src/components/ui/Tooltip.tsx
  modified:
    - web/src/types/api.ts
    - web/src/app/app/trips/result/page.tsx
    - web/src/app/app/trips/[id]/page.tsx
decisions:
  - "Tap-toggle local state + tabIndex=0 + onBlur close so the tooltip works on touch and keyboard, not only hover (D-02)"
  - "Badge placed beside the amount (réel/≈ estimé next to the toll figure) per D-01"
  - "filter(Boolean) cast to a typed array (label/value/badge?) to keep tsc clean while dropping the péages cell entirely when toll null/0"
  - "Tooltip copy duplicated inline on both pages (load-bearing FR strings) rather than extracted — kept identical for consistency, avoids premature abstraction"
metrics:
  duration: "~12min"
  completed: 2026-05-29
  tasks: 3
  files: 4
  commits: 3
---

# Phase 1 Plan 03: Web Toll Display Summary

Delivered the user-facing end of the toll slice (TOLL-04): the trip result now breaks the toll out as its own line that is rolled into the displayed grand total, badges it "réel" (TollGuru) vs "≈ estimé" (heuristic) from `tollIsEstimate`, carries a hover/focus/tap tooltip explaining the source, and hides the line entirely when there is no toll — and the saved-trip detail shows the identical badge driven by the persisted flag, with a new reusable `Tooltip` atom and the save payload now persisting the source flag.

## What Was Built

- **`Tooltip`** (`web/src/components/ui/Tooltip.tsx`, NEW): ~33-line `'use client'` named-export atom. A `relative inline-flex group` focusable wrapper (`tabIndex={0}`) reveals an absolute-positioned surface above the trigger via `group-hover` + `group-focus-within` (desktop + keyboard) plus a `useState` tap-toggle with `onBlur` close (touch) — satisfying D-02. Surface uses Carbon tokens `bg-carbon-surface2`, `text-carbon-ink2`, `border-carbon-hairline`, rounded, `z-50`, `pointer-events-none`, max-width 200px. No `dangerouslySetInnerHTML` — content is React text nodes (T-03-02 mitigation).
- **`SavedTrip.tollIsEstimate`** (`web/src/types/api.ts`): added `tollIsEstimate: boolean` after `tollsCost`, mirroring the `TripResult.tollIsEstimate` comment style.
- **Result page** (`web/src/app/app/trips/result/page.tsx`):
  - Converted the inline 2×2 metrics literal into `const metrics = [...].filter(Boolean)` (typed cast to `{ label; value; badge? }`). The PÉAGES entry is `false` (dropped) when `result.tollCost == null || result.tollCost === 0`, so the `grid grid-cols-2` reflows cleanly with no "0 €" clutter (D-04).
  - When toll > 0, the cell renders the amount with a `<Pill color={tollIsEstimate ? 'warning' : 'success'}>` reading `≈ estimé` / `réel` (D-01), wrapped in `<Tooltip>` with the source copy (D-02). Replaced the old `~` prefix + amber `note` slot.
  - `totalCost` already summed the toll (unchanged). Added `tollIsEstimate: result.tollIsEstimate` to the `POST /trips/save` payload so the flag persists (feeds the plan 01-02 column).
- **Saved-trip detail** (`web/src/app/app/trips/[id]/page.tsx`): inside the existing `{trip.tollsCost > 0 && (...)}` péages block (already hide-when-0 here), added the same `<Pill>` + `<Tooltip>` badge beside the amount, driven by the now-persisted `trip.tollIsEstimate` — identical wording, colors, and tooltip copy as the result page (TOLL-05).

Badge wording (FR): `réel` (success/emerald) / `≈ estimé` (warning/amber). Tooltip copy: estimate → "Estimation indicative (calcul français moyen)"; real → "Prix réel calculé par TollGuru le long de l'itinéraire".

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (after each task) | ✅ clean |
| `npm run build` (after Task 2) | ✅ 18/18 routes |
| `npm run build` (after Task 3) | ✅ 18/18 routes |
| No `TOLLGURU_API_KEY` / `apiKey` reference in `web/src` | ✅ (only the provider name "TollGuru" as static tooltip display text) |

Visual behaviors (badge text/colors, tooltip hover+tap, hide-when-0 reflow) are verified manually in plan 01-04 (no web test infra per CONCERNS).

## Deviations from Plan

None — plan executed as written. The plan said "convert into `.filter(Boolean)`"; I kept that exact approach and added a typed cast (`as Array<{ label; value; badge? }>`) so `tsc --noEmit` stays clean — a faithful implementation of the intent, not a deviation.

## Requirement Coverage

| Req | This plan delivers | Remaining (later plan) |
|-----|--------------------|------------------------|
| TOLL-04 (toll broken out + real/estimate indicator, in total) | Own PÉAGES line, included in displayed total, réel/≈ estimé Pill + Tooltip, hidden when 0 — on result + detail | Live TollGuru visual confirmation — plan 01-04 checkpoint |
| TOLL-05 (persisted toll reflected in detail) | Detail badge renders from persisted `trip.tollIsEstimate`; result save payload persists the flag | — |

## Known Stubs

None. The Tooltip, badge, hide-when-0 filter, and save-payload flag are all real and exercised by the type + build gate.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries. T-03-01 (key never crosses to client) holds: the only TollGuru reference in `web/` is the provider name as static FR display copy; the `TOLLGURU_API_KEY` is never imported or referenced. T-03-02 (tooltip XSS) mitigated: content is static FR strings rendered as React text nodes, no `dangerouslySetInnerHTML`.

## Self-Check: PASSED

- File `web/src/components/ui/Tooltip.tsx` — FOUND.
- Commits `ba1f4e9` (Tooltip + type), `a579291` (result page), `3e423e0` (detail page) — present in `git log`.
- `tsc --noEmit` clean; `next build` 18/18 routes both runs.
