---
phase: 02-editorial-dark-design-system-trip-result-redesign
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - web/src/app/globals.css
  - web/tailwind.config.ts
  - web/src/app/layout.tsx
  - web/src/hooks/useReducedMotion.ts
  - web/src/hooks/useCountUp.ts
  - web/src/components/ui/DataBar.tsx
  - web/src/components/ui/Skeleton.tsx
  - web/src/app/app/trips/result/page.tsx
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: resolved
fixed: [CR-01, WR-01, WR-02, WR-03, WR-05]
deferred: [WR-04, WR-06, IN-01, IN-02, IN-03, IN-04, IN-05]
fix_commit: 7ec80d2
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 2 is a frontend-only visual evolution (MD-2: no backend/route/data/calc change). Core engineering is solid: `useCountUp` cleans up its rAF on unmount/target-change (no leak, no setState-after-unmount), `useReducedMotion` is SSR-safe (`false` default, `matchMedia` subscription in effect), `DataBar` uses compositor-friendly `transform: scaleX` with token-driven CSS-var fills, the skeleton mirrors the new layout for CLS safety, all ad-hoc emerald/sky/violet/amber comparison colors were successfully migrated onto energy tokens, and the save flow / sessionStorage / stepper math / comparison data are all preserved. AA contrast bump on `--c-muted` is correctly applied.

However there is **one BLOCKER**: invalid HTML nesting (`<p>` inside `<h2>`) produced by passing `<Eyebrow>` (renders `<p>`) as `SectionCard`'s `title` (rendered inside `<h2>`), which occurs twice and is a hydration-mismatch / spec-violation hazard. Plus several WARNINGs around the screen-reader counter value, the dominant hero figure rendering a non-FR-locale decimal separator, and the SectionCard `<h2>` overriding the intended eyebrow typography.

Web has no test framework per CLAUDE.md/MD-2 — missing tests are NOT flagged.

## Critical Issues

### CR-01: Invalid HTML — `<p>` nested inside `<h2>` (twice) via SectionCard title

**File:** `web/src/app/app/trips/result/page.tsx:389-393`, `web/src/app/app/trips/result/page.tsx:437-441`
**Issue:** `SectionCard` renders its `title` prop inside an `<h2>` (`SectionCard.tsx:42`). The result page passes `<Eyebrow>…</Eyebrow>` as the title for both "Comparatif énergétique" and "Passagers". `Eyebrow` defaults to `as='p'` (`Eyebrow.tsx:10`), so the rendered DOM is `<h2><span…><p>Comparatif énergétique</p></span></h2>`. `<h2>` accepts only phrasing content; `<p>` is flow content, so this is invalid HTML. The browser will reparent/auto-close the `<p>`, producing a DOM that differs from React's virtual DOM → React 19 hydration mismatch warning and unpredictable layout. It also produces a redundant heading wrapper (`<h2>` + eyebrow) that fights the typography contract.
**Fix:** Pass a phrasing-level element. Either render Eyebrow as a span, or drop the wrapper span and let SectionCard own the heading:
```tsx
// Option A — make Eyebrow phrasing content
title={<Eyebrow as="span">Comparatif énergétique</Eyebrow>}

// Option B (preferred) — don't nest a heading inside the SectionCard heading.
// Render the eyebrow as the section's own content/title text directly,
// or extend SectionCard to accept an `eyebrow` slot rendered as <p> outside <h2>.
```
Apply the same fix to the "Passagers" card (line 437-441).

## Warnings

### WR-01: Screen-reader counter announces per-person value, not the total (spec says total)

**File:** `web/src/app/app/trips/result/page.tsx:291-292`
**Issue:** UI-SPEC §Motion/A11y (lines 244, 365) states the visually-hidden `sr-only` sibling must carry "the final formatted **total**". The code renders `fmtEur.format(perPerson)` in the `sr-only` span. When `passengers > 1`, the animating (aria-hidden) figure shows the per-person amount but there is no accessible exposure of the grand total in the hero — the per-person total sub-line (line 297-301) is not marked up to compensate, and a screen-reader user only hears the per-person figure where the spec promised the total. (When `passengers === 1` the two are equal, masking the bug.)
**Fix:** Decide the intended semantics. If the hero is per-person, keep it but also expose the total accessibly; if it must match the spec, announce the total:
```tsx
<span className="sr-only">
  {fmtEur.format(totalCost)}{passengers > 1 ? `, soit ${fmtEur.format(perPerson)} par personne` : ''}
</span>
```

### WR-02: Dominant hero figure uses `.` decimal separator in a French-locale app

**File:** `web/src/app/app/trips/result/page.tsx:291`
**Issue:** The single most prominent element on the page renders `animatedTotal.toFixed(2)` → e.g. `"12.40"`, using a period. The app is FR-only (i18n disabled per project history) and everywhere else uses `Intl.NumberFormat('fr-FR')` → comma (`"12,40 €"`). The hero therefore shows `12.40 €` while the per-person sub-line, metrics, and comparison values show `12,40 €` — an inconsistent, non-FR-locale figure on the hero. (Using `fmtEur.format()` mid-count is intentionally avoided for CLS, but a comma can still be substituted without breaking `tabular-nums`.)
**Fix:** Replace the dot with the FR decimal comma while keeping fixed 2 decimals (constant width preserved):
```tsx
<span aria-hidden="true">{animatedTotal.toFixed(2).replace('.', ',')}</span>
```
(Or format via `Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` — fixed digits keep CLS at zero.)

### WR-03: SectionCard `<h2>` overrides the intended eyebrow/serif typography contract

**File:** `web/src/app/app/trips/result/page.tsx:389-393`, `web/src/components/ui/SectionCard.tsx:42`, `web/src/app/globals.css:142-146`
**Issue:** The eyebrow titles are wrapped in SectionCard's `<h2>`, which (a) gets `font-family: var(--font-serif)` 400 from globals.css `h1,h2` and (b) gets `text-sm font-semibold` from SectionCard. `font-semibold` is weight 600, which the UI-SPEC §Typography explicitly bans ("2 weights only: 400 and 700. No 500, no 600."). So the section kickers render as serif-400-then-overridden-to-semibold rather than the specified Space Grotesk 700 uppercase caption. Tied to CR-01 — fixing the nesting should also resolve the typography override.
**Fix:** Do not route the eyebrow through SectionCard's `<h2>` title slot (see CR-01 Option B). If headings are wanted, ensure they use the eyebrow style (Space Grotesk, weight 700, `text-caption`, `tracking-eye`, uppercase) rather than the serif `<h2>` + `font-semibold`.

### WR-04: Hero counter re-animates 0→target on every passenger change (visible fl\icker / re-count)

**File:** `web/src/app/app/trips/result/page.tsx:93-96`, `web/src/hooks/useCountUp.ts:25-52`
**Issue:** `heroTarget` depends on `passengers`, and `useCountUp` re-runs from 0 whenever `target` changes (effect dep `[target, ...]`, `setValue(0)` initial state is only first-mount but the loop starts `setValue(target * ease(0)) === 0`). The UI-SPEC line 240 does say "re-runs when `passengers` changes the per-person total", so this is intended per spec — but in practice each stepper click drops the dominant figure back to `0,00 €` and re-counts up over 700ms, which reads as a glitch when a user clicks +/- several times quickly. Worth confirming this is the desired UX vs. tweening from the previous value.
**Fix (if undesired):** Tween from the current value to the new target instead of from 0 on subsequent runs (capture previous value in a ref and animate `prev → target`), or skip the count-up animation for passenger changes and only animate the initial mount.

### WR-05: `total === 0` produces an empty/zero-width breakdown bar with no fallback

**File:** `web/src/app/app/trips/result/page.tsx:303-310`, `web/src/components/ui/DataBar.tsx:88-113`
**Issue:** When `cost` is absent and `tollCost === 0` (e.g. distance-mode without a computed cost, or a 0-cost edge case), `totalCost === 0`. The Variant A bar computes `pct(energyValue, total)` with `total=0` → `pct` returns 0 → the energy fill renders at `width: 0%`, leaving an empty grey track with no content and no indication of why. The hero will also show `0,00 €`. Not a crash, but a degenerate empty-state the redesign doesn't address.
**Fix:** Guard the breakdown bar / hero when `totalCost <= 0` (render the "Non calculé" affordance already used in the metrics, or hide the bar) so an empty track is never shown.

### WR-06: `revealStyle` keyframe animation can leave items at `opacity: 0` if animation never fires

**File:** `web/src/app/app/trips/result/page.tsx:100-106`, `web/src/app/globals.css:108-111`
**Issue:** Reveal items set `animation: 'reveal 360ms ease-out both'` with the `reveal` keyframe starting at `opacity: 0`. `animation-fill-mode: both` holds the `from` state before the animation starts. If the CSS animation does not run for any reason (e.g. an environment that disables CSS animations but where `useReducedMotion()` still returned `false`, or `globals.css` failing to load the keyframe), the legend items, metric tiles, and comparison rows would be stuck invisible (`opacity: 0`) — content hidden, not just unanimated. This is a fragile default for primary content (cost breakdown values).
**Fix:** Prefer animating from a safe visible baseline, or ensure the non-animated state is the visible one. E.g. apply the reveal as a class that only adds the entrance, with the resting style being fully opaque, so a missing animation degrades to visible content rather than hidden.

## Info

### IN-01: `useCountUp` `rafId` may be `undefined` in the cleanup closure on a synchronous early-cleanup path

**File:** `web/src/hooks/useCountUp.ts:31,50-51`
**Issue:** `let rafId: number;` is assigned at line 50 before the return, so on the normal path it is defined. The reduced-motion / `durationMs <= 0` branch returns early (line 28) without registering a cleanup, so there is no `cancelAnimationFrame(undefined)` risk. This is correct as written; noting only that `cancelAnimationFrame(undefined)` is a no-op in browsers anyway. No action required — flagged for completeness.
**Fix:** None needed; optionally initialize `let rafId = 0;` for explicitness.

### IN-02: DataBar discriminated union relies on a runtime `'energyValue' in props` + `!== undefined` check

**File:** `web/src/components/ui/DataBar.tsx:88`
**Issue:** Variant selection uses `'energyValue' in props && props.energyValue !== undefined`. Because both variant prop sets are mutually `never`-typed, the type-level discrimination is sound, but the extra `!== undefined` guard means a Variant A call that legitimately passes `energyValue={0}` still takes Variant A (0 !== undefined) — fine here. Just note the discriminator is value-based, not tag-based; a `variant` literal would be more robust.
**Fix:** Optional — add an explicit `variant: 'segmented' | 'single'` discriminator for clarity.

### IN-03: Comparison sub-caption `unitPrice.toFixed(4)` may render `.` decimals (locale)

**File:** `web/src/app/app/trips/result/page.tsx:427`
**Issue:** `comp.unitPrice.toFixed(4)` and `comp.consumption.toFixed(...)` render with a `.` separator (e.g. `0.2272 €/kWh`) in an otherwise FR-formatted page. Pre-existing behavior kept per spec ("sub-caption kept"), so low priority, but inconsistent with the FR locale used elsewhere.
**Fix:** Optionally route through `Intl.NumberFormat('fr-FR', { minimumFractionDigits, maximumFractionDigits })`.

### IN-04: `font-medium` (500) in reused CTAButton conflicts with "2 weights only" contract

**File:** `web/src/components/ui/CTAButton.tsx:54`
**Issue:** UI-SPEC mandates exactly weights 400/700. The reused `CTAButton` applies `font-medium` (500); `SectionCard` `<h2>` applies `font-semibold` (600). These are pre-existing reused atoms (spec says reuse as-is), so not a Phase-2 regression, but they do violate the documented weight discipline the phase is establishing.
**Fix:** When Phase 3 standardizes atoms, normalize button/heading weights to 400/700.

### IN-05: `useReducedMotion` is duplicated-subscribed across many components (multiple `matchMedia` listeners)

**File:** `web/src/hooks/useReducedMotion.ts:20-28` (consumed by DataBar, Skeleton, useCountUp, result page)
**Issue:** Each component instance using the hook (and the result page renders many `DataBar`/`Skeleton` instances) registers its own `matchMedia` listener. Functionally correct and cleaned up on unmount, but on a page with N bars + skeletons this is N listeners doing identical work. Not a correctness or v1-scope perf issue.
**Fix:** Optional — hoist to a single context/provider so the preference is read once and shared.

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning  | 6 |
| Info     | 5 |
| **Total**| **12** |

**Verdict:** issues_found — one BLOCKER (CR-01 invalid `<p>` in `<h2>`, ×2) must be fixed before ship; WR-01/WR-02 (a11y counter value + FR-locale hero decimal) are high-value correctness/UX fixes on the page's dominant element.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
