---
phase: 03-web-redesign-rollout
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - web/src/app/page.tsx
  - web/src/app/login/page.tsx
  - web/src/app/register/page.tsx
  - web/src/app/app/dashboard/page.tsx
  - web/src/app/app/garage/page.tsx
  - web/src/app/app/garage/[id]/page.tsx
  - web/src/app/app/garage/add/page.tsx
  - web/src/app/app/trips/page.tsx
  - web/src/app/app/trips/[id]/page.tsx
  - web/src/app/app/favorites/page.tsx
  - web/src/app/app/fuel-prices/page.tsx
  - web/src/app/app/settings/page.tsx
  - web/src/components/layouts/AppLayout.tsx
  - web/src/components/AutocompleteInput.tsx
  - web/src/components/MapboxMap.tsx
  - web/src/components/TripModal.tsx
  - web/src/components/ui/CTAButton.tsx
  - web/src/components/ui/SectionCard.tsx
  - web/src/components/ui/Input.tsx
  - web/src/components/ui/Select.tsx
  - web/src/components/ui/Modal.tsx
  - web/src/components/ui/KPICell.tsx
  - web/src/components/ui/Eyebrow.tsx
  - web/src/components/ui/Pill.tsx
  - web/src/components/ui/FuelBadge.tsx
  - web/src/components/ui/BrandAvatar.tsx
  - web/src/components/ui/NumberDisplay.tsx
  - web/src/components/ui/SegmentedControl.tsx
  - web/src/components/ui/Wordmark.tsx
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: resolved
md2_regressions: 0
fixed: [WR-01, WR-02]
deferred: [IN-01-decimal-sr-only, IN-02-mapbox-setHTML-preexisting, IN-03-mapbox-console-warn-preexisting, IN-04-stale-serif-comment]
---

# Phase 3: Code Review Report — Web Redesign Rollout

**Reviewed:** 2026-06-02
**Depth:** standard (with behavior-diff vs phase-start commit 79b6d07~1)
**Files Reviewed:** 29
**Status:** issues-found (no MD-2 behavior regressions; 2 normalization gaps)

## Summary

Primary objective was to catch MD-2 regressions — places where a restyle accidentally changed
behavior. **None were found.** Every high-risk screen was diffed against "should be restyle-only"
and traced through its logic:

- **Dashboard** (424-line recompose): calc logic byte-identical — `handleQuickCalc` still produces
  `cost.toFixed(2)` / `Math.round(km)`; the added `quickResultValue`/`quickResultUnit` state is
  purely additive presentation (drives the animated mono figure) and does not alter any computed
  number. The "Calculer" button, sessionStorage entry behavior, `vehicleId` URL handling,
  `savedVsGas` null/percent logic, and recent-trips/skeleton gating (`statsLoading` correctly gates
  the same `Promise.allSettled` batch) are all preserved. SegmentedControl swap is type-safe and
  wires the same `setQuickCalcTab` + reset.
- **Trip detail** (D-12 toll relocation): the toll moved from a standalone row into the Variant-A
  `DataBar` legend. `energyValue = totalCost - tollsCost` is **correct** — saved trips persist
  `totalCost = energy + toll` (result/page.tsx:145), so the split reconstructs energy faithfully.
  D-04 hide-when-0 (`trip.tollsCost > 0`) preserved; the réel/≈ estimé `Pill` + `Tooltip` (Phase 1)
  kept verbatim. Note auto-save, archive toggle, and `use(params)` resolver are untouched.
- **Garage / showroom**: CRUD untouched; the showroom client-load-all data loading (CAT-06 / Phase 4
  fence) was NOT touched — only the raw `<input>` was swapped for the `<Input>` atom, which spreads
  `...props` (value/onChange/type/placeholder/aria-label) onto the real `<input>`, so behavior holds.
- **Auth / favorites / trips list / settings / fuel-prices**: submit+zod, deep-link, pagination+
  filters, theme toggle + hydration guard + logout, and localStorage save are all outside the diffs
  (restyle-only). Atom normalization (weights → 400/700, canonical focus ring) is otherwise thorough.

Secondary checks: D-11 holds (no serif font is used anywhere — only a stale comment in the locked
`globals.css` and correct `sans-serif` fallbacks); no `console.log` introduced this phase; toggle
weights are constant across active/inactive states (no CLS); animations are transform/opacity only.

## Warnings

### WR-01: Non-canonical focus ring left un-normalized in AutocompleteInput
**File:** `web/src/components/AutocompleteInput.tsx:90`
**Issue:** The atom-normalization wave updated this component's label weight (l.74,
`font-semibold`→`font-bold`) but missed the input's focus ring. Line 90 still uses the **old**
pattern `focus:outline-none focus:ring-2 focus:ring-carbon-accent focus:border-carbon-accent` —
no `focus-visible:`, no `/50`, no `ring-offset`. The UI-SPEC explicitly names "Autocomplete" in the
focus-standardization list (lines 142-143) and the consistency checklist demands **zero**
non-canonical rings / `focus:ring-offset-0`. Functional impact: the ring renders on mouse-click too
(not just keyboard), inconsistent with every other input. AutocompleteInput is live (used in
`TripModal`).
**Fix:** Replace the focus classes on the input with the canonical token used everywhere else:
```tsx
className="w-full pl-8 pr-8 py-2.5 bg-carbon-surface border border-carbon-hairline rounded-xl text-sm text-carbon-ink placeholder:text-carbon-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg focus:border-carbon-accent transition-colors"
```

### WR-02: Import statements interleaved with const declarations (import/first)
**File:** `web/src/app/app/fuel-prices/page.tsx:11-21`
**Issue:** `const FOCUS_RING` (l.11-13) and `const SOURCE_META` (l.15-18) are declared **between**
`import` statements — three imports (`useToast`, `apiClient`, `DefaultPrices`) follow at l.19-21.
It works at runtime (ES `import` declarations are hoisted) and compiles (the `PriceSource` type used
by `SOURCE_META` at l.15 is type-hoisted and erased), but it violates the `import/first` convention
and the project's "0 ESLint error" clean-build standard. It is fragile: if `import/first` is enabled
in the lint config, `next build` (which runs lint) fails.
**Fix:** Move both `const` declarations below all imports:
```tsx
import { useState, useEffect, type ReactNode } from 'react';
import { Save, /* ... */ RadioTower, Pencil } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
// ...all other imports...
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { DefaultPrices } from '@/types/api';

const FOCUS_RING = '...';
const SOURCE_META: Record<PriceSource, { label: string; icon: ReactNode }> = { /* ... */ };
```
(Also move them after the `type PriceSource = 'api' | 'custom'` declaration for readability.)

## Info

### IN-01: Visible figure uses comma decimal but sr-only/aria value keeps the period
**File:** `web/src/app/app/dashboard/page.tsx:336-343`; `web/src/app/app/trips/[id]/page.tsx:237`
**Issue:** The animated hero figure renders `animatedResult.toFixed(2).replace('.', ',')` (FR comma),
while the `sr-only` value still emits the raw `quickResult` string (`"12.34 €"`, period). Screen
readers announce a different decimal separator than the visible figure. Pure display (MD-2-safe).
**Fix:** Make the `sr-only` span format consistently, e.g. `{quickResult?.replace('.', ',')}`.

### IN-02: Mapbox popup builds HTML via setHTML with interpolated station fields
**File:** `web/src/components/MapboxMap.tsx:73`
**Issue:** The popup is built with `new mapboxgl.Popup().setHTML(\`...${station.name}...${station.address}...\`)`
— an innerHTML sink with un-escaped data. **Pre-existing** (this phase only restyled the class names
on this line: `font-semibold`→`font-bold`, `text-gray-500`→`text-carbon-muted`); not a phase
regression, and station data comes from the trusted gov IRVE API. Flagged because the line was
touched.
**Fix (when convenient):** Build the popup with `setDOMContent` + `textContent`, or escape the
interpolated fields.

### IN-03: Stale "serif" comment in locked globals.css
**File:** `web/src/app/globals.css:35`
**Issue:** `--text-display` carries the comment `/* serif title / large heading */`, but no serif
font is used (the `font-display` family resolves to Space Grotesk + `sans-serif` fallback). D-11 is
honored; the comment is misleading. Out of phase scope (globals.css is the locked Phase-2 file, not
in the change set).
**Fix:** Drop the word "serif" from the comment during the next globals.css touch.

### IN-04: Pre-existing console.warn in MapboxMap
**File:** `web/src/components/MapboxMap.tsx:34`
**Issue:** `console.warn('[MapboxMap] NEXT_PUBLIC_MAPBOX_TOKEN is not set')` exists in client code.
**Pre-existing** (not introduced this phase — outside the diff). The CWV guard ("no console.log
introduced") is satisfied for Phase 3. Noted for completeness against the project no-console rule.
**Fix:** Optional — gate behind `process.env.NODE_ENV !== 'production'` or remove.

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning  | 2 |
| Info     | 4 |
| **Total**| **6** |

**MD-2 verdict:** PASS — zero behavior regressions across all high-risk recomposed screens. The two
warnings are normalization/quality gaps (one missed focus ring, one import-ordering nit), neither of
which changes behavior. Safe to ship after addressing WR-01 (consistency contract) and WR-02 (clean
build).

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
