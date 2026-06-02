---
phase: 02-editorial-dark-design-system-trip-result-redesign
plan: 05
subsystem: verification / visual checkpoint
tags: [ui, checkpoint, human-verify, editorial-dark]
outcome: passed-with-revision
checkpoint:
  type: human-verify
  result: approved
decisions:
  - "D-11 (revert serif display): user reviewed the live redesign and preferred the previous title font — Instrument Serif (editorial serif display) was dropped; titles revert to Space Grotesk bold 700. The --text-display SIZE token + everything else (palette, 2-weight system, DataBars, counter, motion) kept."
key-files:
  created: []
  modified: []
metrics:
  completed: 2026-06-02
  tasks: 2
---

# Plan 02-05 — Visual + Motion Checkpoint Outcome

## Result: APPROVED (with one revision)

User verified the redesigned trip result page on the deployed site across dark + light.

| Check | Result |
|-------|--------|
| 1. Title font (was: editorial serif) | ❌ → **revised**: user preferred the previous font; Instrument Serif dropped, titles now Space Grotesk bold (D-11) |
| 2. Animated mono hero counter (0→total, FR comma, no CLS) | ✅ |
| 3. Breakdown bar Énergie/Péage, hide-when-toll-0 | ✅ |
| 4. Comparison bars, unified energy colors + "← actuel" | ✅ |
| 5. Interaction states + loading skeleton | ✅ |
| 6. prefers-reduced-motion disables counter/reveal | ✅ |
| 7. Light/dark parity | ✅ |

## Revision applied (D-11)

Dropped the editorial serif display face (Instrument Serif) per user preference; reverted
all titles/headings (`h1`/`h2`, result route title) to Space Grotesk weight 700. The
`--text-display` size token and the rest of the editorial-dark system are unchanged. The
"editorial" character now comes from the refined palette, the disciplined 4-size/2-weight
scale, the data-viz bars, and the measured motion — not a serif font.

- Commit: `c585592` — `fix(02): revert serif display font to Space Grotesk per user preference (drop Instrument Serif)`
- Verified: zero `Instrument_Serif`/`--font-serif`/`font-serif` refs remain; web `tsc` clean; `npm run build` 18/18 green.

## Deferred (non-blocking, from code review 02-REVIEW.md)

WR-04 (hero counter re-counts 0→target on each passenger change — per-spec; tween-from-previous
if it ever reads glitchy), WR-06 (reveal keyframe resting opacity), IN-04/IN-05 (CTAButton
font-medium + per-instance reduced-motion listeners → normalize when Phase 3 standardizes atoms).

## Outcome

Phase 2 visual contract confirmed on the live site. Phase complete.
