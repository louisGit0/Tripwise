---
phase: 08-onboarding
plan: 01
subsystem: web
tags: [onboarding, web, localStorage, editorial-dark, ux]
requires:
  - "web AppLayout authenticated shell"
  - "GET /auth/me (UserProfile.id)"
  - "ui atoms: CTAButton, Eyebrow; useReducedMotion hook"
provides:
  - "web/src/lib/onboarding.ts — per-user seen-flag helpers + ONBOARDING_OPEN_EVENT"
  - "web/src/components/OnboardingTour.tsx — full-screen 7-step editorial-dark FR carousel"
  - "Settings 'Revoir le tutoriel' replay entry"
affects:
  - "web/src/components/layouts/AppLayout.tsx"
  - "web/src/app/app/settings/page.tsx"
tech-stack:
  added: []
  patterns:
    - "client-side per-user localStorage flag (no backend) keyed by /auth/me user id"
    - "window CustomEvent bus to decouple Settings replay trigger from the tour component"
    - "transform/opacity-only transitions gated by prefers-reduced-motion"
key-files:
  created:
    - web/src/lib/onboarding.ts
    - web/src/components/OnboardingTour.tsx
  modified:
    - web/src/components/layouts/AppLayout.tsx
    - web/src/app/app/settings/page.tsx
decisions:
  - "D-33 — client-side per-user onboarding tour (auto-show once + replay from Settings, zero backend)"
metrics:
  duration: ~9min
  tasks: 2
  files: 4
  completed: 2026-06-03
---

# Phase 8 Plan 01: Web Onboarding Tour Summary

Post-signup, full-screen editorial-dark 7-step FR carousel that auto-shows once per user on the
first authenticated web load (client-side `localStorage` seen flag, no backend), is dismissible,
honors reduced motion, and is replayable any time from Settings via a window-event bus.

## What Was Built

- **`web/src/lib/onboarding.ts`** — `hasSeenOnboarding(userId)` / `markOnboardingSeen(userId)`
  reading/writing the exact key `verygoodtrip.onboarding.seen.${userId}` (stores `'1'`), both
  `typeof window`-guarded (SSR-safe → `false`/no-op on server) and wrapped so a storage exception
  never throws; plus `ONBOARDING_OPEN_EVENT = 'verygoodtrip:onboarding:open'`. (ONB-3)
- **`web/src/components/OnboardingTour.tsx`** — a self-contained `'use client'` component (no
  required props). On mount it fetches `apiClient.get<UserProfile>('/auth/me')` (errors swallowed
  → never auto-show), keys the flag by `user.id`, and **auto-opens only when the flag is unset**
  (ONB-5). A `window` `ONBOARDING_OPEN_EVENT` listener re-opens it **regardless of the flag**
  (ONB-4 replay), removed on unmount. Full-screen `z-[120]` overlay: carbon backdrop
  (click-to-dismiss) + centered `bg-carbon-surface`/`border-carbon-hairline`/`rounded-card` panel.
  Each step: `Eyebrow` "Étape N / 7", a lucide icon chip, an `h2 font-display` title, a
  `text-carbon-ink2` body, 7 progress dots (active `bg-carbon-accent` + widened, inactive
  `bg-carbon-surface2`), and footer controls — **Passer** (ghost), **Précédent** (hidden on step
  0), **Suivant** (steps 0–5), **Terminer** (last). Skip / Terminer / close(X) / backdrop /
  Escape all `markOnboardingSeen(userId)` then close (no auto-reshow). Transitions are
  transform/opacity only, suppressed under `useReducedMotion()`.
- **7 hardcoded-FR steps** (no i18n, per the web's post-next-intl approach): (1) Bienvenue +
  value prop; (2) Calculer un trajet (dashboard: départ/arrivée, véhicule, coût total énergie +
  péage); (3) Garage & showroom; (4) **Péages — "estimé et déjà inclus dans le coût total"**
  (NO real/estimate badge wording — that badge was removed in Phase 6); (5) Trajets & historique;
  (6) Favoris; (7) Paramètres (thème, pseudo, langue, rejouer le tutoriel).
- **`AppLayout`** mounts a single `<OnboardingTour />` alongside `<TripModal />` so it shows
  across all `/app/*` routes — additive only, no nav/sidebar/drawer/topbar change. (ONB-5)
- **Settings** gains an "Aide" `SectionCard` with a ghost `CTAButton` "Revoir le tutoriel"
  (lucide `PlayCircle`) whose `onClick` dispatches `window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))`
  — re-opens the tour regardless of the seen flag; theme/pseudo/logout flows untouched. (ONB-4)

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Seen-flag util + OnboardingTour (7 FR steps, auto-show, replay event) | `04416d2` | web/src/lib/onboarding.ts, web/src/components/OnboardingTour.tsx |
| 2 | Mount in AppLayout + Settings "Revoir le tutoriel" | `51ea9bd` | web/src/components/layouts/AppLayout.tsx, web/src/app/app/settings/page.tsx |

## Verification

- `cd web && npx tsc --noEmit` — clean (after each task).
- `cd web && npm run build` — green, **18/18 routes** (`/app/settings` 5.89 kB), 0 ESLint errors.
- Grep gates:
  - `verygoodtrip.onboarding.seen` present in `web/src/lib/onboarding.ts`.
  - `font-serif|Instrument` → 0 matches in `OnboardingTour.tsx` (no serif, D-11).
  - `OnboardingTour` → 1 mount in `AppLayout.tsx`.
  - `Revoir le tutoriel` + `ONBOARDING_OPEN_EVENT`/`dispatchEvent` present in Settings.
- Manual smoke (Wave 2 checkpoint): first authed load with unset flag shows the tour; finishing
  sets the flag; reload does not reshow; Settings "Revoir le tutoriel" re-opens it.

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered; no new dependency added
(threat T-08-01-SC held).

## Threat Surface

No new security-relevant surface beyond the plan's `<threat_model>`. The seen flag is a
non-sensitive cosmetic boolean keyed by the user's own id (already in their JWT/cookie);
`/auth/me` is an existing authenticated read; the replay window event opens a read-only UI
overlay carrying no data. All registered threats remain `accept` (cosmetic) / `mitigate` (no
installs).

## Known Stubs

None — the tour is fully wired (auto-show, persistence, replay) with no placeholder data sources.

## Self-Check: PASSED

- FOUND: web/src/lib/onboarding.ts
- FOUND: web/src/components/OnboardingTour.tsx
- FOUND: commit 04416d2
- FOUND: commit 51ea9bd
