# verygoodtrip

## What This Is

verygoodtrip is a web + mobile app that calculates the real cost of a car trip (fuel or electric) between two points in France — including tolls — for a specific vehicle from the user's garage. It combines live fuel prices, EV charging modes, real route distance, and toll costs, plus trip history and savings stats. For French drivers who want a trustworthy total before they go.

## Core Value

Give an accurate, trustworthy **total trip cost** (energy + tolls) for a specific vehicle, instantly. If everything else fails, the number must be right and clearly presented.

## Requirements

### Validated

<!-- Inferred from the existing codebase (.planning/codebase/) — shipped and relied upon. -->

- ✓ Authentication: email/password + Google + Apple OAuth, JWT — existing
- ✓ Vehicle garage: catalogue (~266 models, ADEME sync), add/edit/delete, default vehicle, EV pricing — existing
- ✓ Trip calculation: Mapbox distance/duration, fuel cost (live prices), EV cost (home/public/mix charging) — existing
- ✓ Fuel prices (Opendatasoft) + charging stations (IRVE/ODRÉ) — existing
- ✓ Favorites, trip history, monthly stats, multi-energy comparison — existing
- ✓ Toll cost: heuristic estimate + optional TollGuru integration (`tollCost` / `tollIsEstimate`) — existing
- ✓ Two clients: Next.js 15 web (Vercel) + Expo mobile; dark "Carbon" design system — existing

### Active

<!-- This milestone: "Precise tolls + editorial redesign". Hypotheses until shipped. -->

- [ ] Precise tolls via TollGuru (live): real origin→destination tolls, vehicle class, graceful fallback to heuristic, clear "real vs estimate" UI — web + mobile
- [ ] New visual direction — **editorial premium dark** — applied across all screens (expressive typography, strong hierarchy, cost/consumption/toll data-viz, generous spacing); existing architecture & flows preserved
- [ ] Polished micro-interactions: smooth transitions, designed hover/focus/press states, skeletons, animated cost counters
- [ ] Redesign applied consistently on **both web and mobile**

### Out of Scope

<!-- Explicit boundaries for THIS milestone. -->

- Mappy / ViaMichelin toll APIs — TollGuru chosen instead
- Light-first / glassmorphism / bento directions — editorial dark chosen
- Heavy scroll/page animations & scrollytelling — measured micro-interactions chosen (perf)
- Other roadmap features (geolocated auto-history, multi-currency, vehicle comparator, carpooling) — deferred to later milestones
- Finishing the brand rename of the GitHub repo, Render service URL, and `@tripwise/shared` package — separate chore, not blocking
- i18n V2 (FR/EN re-enable) — out of this milestone

## Context

- Mature monorepo: `backend/` (NestJS + TypeORM + Postgres/Supabase, deployed on Render), `web/` (Next.js 15 App Router, deployed on Vercel), `mobile/` (Expo SDK 54, not yet deployed), `shared/` (`@tripwise/shared` TS types).
- Tolls are **already partially implemented** in `backend/src/trips/trips.service.ts` (heuristic + TollGuru branch) and surfaced in `web/src/app/app/trips/result/page.tsx` and `[id]/page.tsx` — this milestone upgrades accuracy + presentation rather than building from scratch.
- Web i18n is disabled in V1 (hardcoded FR); `web/messages/*.json` remain but unused.
- Mobile has ~7 pre-existing TypeScript errors in files unrelated to this work (`Colors as const` union, `@rnmapbox/maps` overload) and incompletely installed deps — surfaced in `.planning/codebase/CONCERNS.md`.
- Full codebase analysis lives in `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).

## Constraints

- **Tech stack**: NestJS + TypeORM + Postgres, Next.js 15 + Tailwind, Expo SDK 54 — do not introduce conflicting frameworks; reuse existing patterns.
- **Dependency**: precise tolls require a `TOLLGURU_API_KEY` (free tier limited, then paid) — must degrade gracefully to the heuristic when absent or over quota.
- **Performance**: web Core Web Vitals targets; mobile must stay smooth; animate only compositor-friendly properties (transform/opacity).
- **Mobile**: `@rnmapbox/maps` needs an EAS dev build (not Expo Go); design tokens must work in RN StyleSheet (no Tailwind).
- **Security**: Mapbox/public tokens domain-restricted; no secrets committed; TollGuru key server-side only.
- **Deployment**: `master` auto-deploys (Render + Vercel) — commit + push after each verified update (user preference).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Precise tolls via TollGuru (live) | Only practical API giving origin→destination toll pricing; existing branch already present | — Pending |
| Editorial premium dark direction | User choice; evolves the existing Carbon identity, keeps brand cohesion (Linear/Vercel vibe) | — Pending |
| Preserve architecture, redesign visual layer only | Lower risk, faster, keeps working flows intact | — Pending |
| Measured micro-interactions over heavy animation | Best impact/effort ratio and safest for performance | — Pending |
| Apply redesign to web AND mobile | Cross-platform brand/UX consistency | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-29 after initialization*
