---
phase: 07-showroom-v2
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 15
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: resolved
fixed: [WR-01, WR-02, WR-03, WR-04]
deferred: [IN-01, IN-02, IN-03]
---

# Phase 7: Code Review — Showroom v2

**0 Critical.** Security-critical surface clean: `CARIMAGES_API_KEY` server-side only (never in
`{imageUrl}` response or client bundle — clients call OUR endpoint), no SSRF (hard-coded base +
`encodeURIComponent(make/model)` over a `@MaxLength(80)` DTO), never-throw graceful degradation,
MD-2 preserved (Phase-4 server search + pagination, no client load-all, intact `POST /vehicles/me`),
fetch cancellation guards all setState (no leak).

## Warnings (all FIXED)

- **WR-01** — `vehicle-image.service.ts`: transient CarImages failures (429/5xx/timeout/parse) were
  `cacheAndReturn(null)` with the 30-day TTL → cache poisoning; photos never "light up" for those
  models for 30 days. Fix: mirror TollService — only cache the OK-path result (definitive URL or
  definitive no-photo); transient failures return null WITHOUT caching so the next call retries.
- **WR-02** — mobile `vehicles.tsx` + `types/api.ts` read `consumptionPer100km` but the catalog API
  returns `consumption` → blank consumption on every redesigned card/row. Fix: rename to `consumption`.
- **WR-03** — per-card image fetch fan-out (~60/page) vs the global 100 req/min ThrottlerGuard → 429s →
  random photos degrade to placeholder. Fix: `@SkipThrottle()` on the read-only cached image endpoint
  (cheapest robust fix; it's GET-only, key-safe, cached).
- **WR-04** — leftover `blue-500` literals in `garage/add` (brand-jump chip + model card hover) →
  `carbon-accent` tokens (editorial-dark rule).

## Info (deferred)
- IN-01 unused `fuelType` prop on VehicleImage; IN-02 duplicated brand hue/initials helper (web vs mobile); IN-03 web `object-contain` vs mobile `cover` image scaling.
