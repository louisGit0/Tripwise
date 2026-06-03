---
phase: 07-showroom-v2
plan: 04
subsystem: verification / showroom checkpoint
tags: [showroom, checkpoint, human-verify, photos, gap-fix]
outcome: passed
checkpoint:
  type: human-verify
  result: approved
key-files:
  created: []
  modified: []
metrics:
  completed: 2026-06-03
  tasks: 1
---

# Plan 07-04 — Showroom v2 Checkpoint Outcome

## Result: APPROVED

User validated the showroom redesign (web + mobile): designed editorial-dark vehicle cards, simpler
search/nav, photo-or-placeholder treatment. Real photos deferred — `CARIMAGES_API_KEY` not yet set in
prod, so cards show the stylized brand placeholder (graceful, by design); photos will "light up" when
the free key is added. ("Tout ce que tu as fait est validé, on verra plus tard pour les photos.")

## Automated gate

- Code review (07-REVIEW.md): **0 Critical** (key server-side only, no SSRF, never-throw graceful,
  MD-2 server-search/pagination preserved, fetch cancellation clean). 4 warnings fixed (commit 398c247):
  transient-failure cache poisoning, mobile blank consumption, image-fan-out throttle (`@SkipThrottle`
  on the read-only image endpoint), blue→accent token. Info deferred.
- backend tsc/build + image unit 18/18 + e2e 160/160; web tsc + build 18/18; mobile tsc green.

## Requirements (SHOW-01..03)

- SHOW-01 designed cards (web + mobile) ✓
- SHOW-02 photos via CarImages (server proxy + cache + key-safe + brand-placeholder fallback; ships
  without key) ✓ — real photos pending the free key in prod.
- SHOW-03 simplified showroom search/nav ✓

## Gap-fix folded in at this checkpoint (user-reported, web-only)

**"Dépenses 30j" dashboard card was blank.** Root cause: `getStats.dailyExpenses` only included days
with trips in the current month (sliced to 14) → a 1-trip user had a single point, and `Sparkline`
returns null for <2 points → blank. Fixed (commit 229582d): `dailyExpenses` is now a real rolling
**30-day zero-filled** series (dedicated query, independent of the month KPIs, computed on both the
empty-month and normal paths) + a frontend `>= 2` guard. e2e updated (length 30, ascending, seeded
day cost, empty-month still populated). full e2e 160/160. Mobile has no 30j section → web-only.

## Outcome

Showroom v2 approved + the 30j dashboard bug fixed. **Phase 7 complete.** Next: Phase 8 (Onboarding).
Optional follow-up: set `CARIMAGES_API_KEY` in Render to enable real photos.
