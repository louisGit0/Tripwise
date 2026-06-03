---
phase: 08-onboarding
plan: 02
subsystem: mobile
tags: [onboarding, mobile, expo, secure-store, editorial-dark, ux]
requires:
  - "authenticated (tabs) shell (AuthContext token gate)"
  - "GET /auth/me (user id)"
  - "ui atoms: Button, Eyebrow; useReducedMotion hook; editorial-dark theme tokens"
provides:
  - "mobile/src/lib/onboarding.ts — per-user expo-secure-store seen-flag helpers + ONBOARDING_OPEN_EVENT"
  - "mobile/src/components/OnboardingTour.tsx — RN Modal 7-step editorial-dark FR/EN carousel"
  - "Settings 'Revoir le tutoriel' replay entry"
affects:
  - "mobile/app/(tabs)/_layout.tsx"
  - "mobile/app/(tabs)/settings.tsx"
  - "mobile/src/i18n/translations/fr.ts"
  - "mobile/src/i18n/translations/en.ts"
tech-stack:
  added: []
  patterns:
    - "client-side per-user expo-secure-store flag (no backend) keyed by /auth/me user id"
    - "DeviceEventEmitter app-local bus to decouple Settings replay trigger from the tour component"
    - "RN Modal animationType 'none' under AccessibilityInfo reduced motion"
key-files:
  created:
    - mobile/src/lib/onboarding.ts
    - mobile/src/components/OnboardingTour.tsx
  modified:
    - mobile/app/(tabs)/_layout.tsx
    - mobile/app/(tabs)/settings.tsx
    - mobile/src/i18n/translations/fr.ts
    - mobile/src/i18n/translations/en.ts
decisions:
  - "D-34 — mobile ONB-01: client-side per-user onboarding tour (auto-show once + replay from Settings, zero backend), mirroring web 08-01 via expo-secure-store + DeviceEventEmitter"
metrics:
  duration: ~10min
  tasks: 2
  files: 6
  completed: 2026-06-03
---

# Phase 8 Plan 02: Mobile Onboarding Tour Summary

Post-signup, full-screen editorial-dark 7-step FR/EN carousel (RN `Modal`) that auto-shows once per
user on the first authenticated Expo load (client-side `expo-secure-store` seen flag, no backend),
is dismissible, honors reduced motion, and is replayable any time from Settings via a
`DeviceEventEmitter` bus — the mobile mirror of the web tour (08-01).

## What Was Built

- **`mobile/src/lib/onboarding.ts`** — `hasSeenOnboarding(userId)` / `markOnboardingSeen(userId)`
  reading/writing the exact key `verygoodtrip.onboarding.seen.${userId}` (stores `'1'`) via
  `expo-secure-store` (the same pattern as `auth/storage.ts`), both wrapped in try/catch so a
  storage exception **never throws** (read error → `false`; write error → no-op). Plus
  `ONBOARDING_OPEN_EVENT = 'verygoodtrip:onboarding:open'`. (ONB-3 — per-user/per-device, no backend.)
- **`mobile/src/components/OnboardingTour.tsx`** — a self-contained component (no required props).
  On mount it calls `client.get<{ id }>('/auth/me')` (errors swallowed → never auto-show), captures
  the user id, and **auto-opens only when `hasSeenOnboarding(id)` resolves false** (ONB-5). A
  `DeviceEventEmitter.addListener(ONBOARDING_OPEN_EVENT, …)` re-opens it **regardless of the flag**
  (ONB-4 replay), removed via `sub.remove()` on unmount; all setState is guarded by a `mountedRef`.
  Renders an RN `<Modal animationType={reduced ? 'none' : 'fade'} transparent visible onRequestClose>`
  (Android back button dismisses, not blocks): a translucent `c.bg` + `d9` backdrop and a centered
  editorial-dark panel (`c.surface` / `c.hairline` border / `Radius.card`). Each step shows an
  `Eyebrow` "Étape N / 7" counter (i18next `onboarding.step` with `n`/`total`), a `Fonts.display` 700
  `c.ink` title, a `Fonts.displayRegular` 400 `c.ink2` body, a row of **7 progress dots** (active
  `c.accent` + widened, inactive `c.surface2`), and controls — **Passer** (ghost `TouchableOpacity`),
  **Précédent** (secondary, hidden on step 0), **Suivant** (steps 0–5), **Terminer** (last step).
  Skip / Terminer / `onRequestClose` all `markOnboardingSeen(userId)` then close (no auto-reshow).
  `useColorScheme()` default `'dark'`; `useReducedMotion()` flips the Modal animation to `'none'`.
- **7 i18next steps (FR + EN, symmetric)** in `onboarding.*`: (1) Bienvenue + value prop; (2) Calculer
  un trajet; (3) Garage & showroom; (4) **Péages — "estimés et déjà inclus dans le coût total"**
  (NO real/estimate badge wording — that badge was removed in Phase 6); (5) Trajets & historique;
  (6) Favoris; (7) Paramètres (thème, pseudo, langue, rejouer ce tutoriel). Plus nav labels
  (`skip`/`next`/`prev`/`finish`/`replay`) and the `step` counter template.
- **`(tabs)/_layout.tsx`** wraps the return in a Fragment and renders a single `<OnboardingTour />`
  sibling to `<Tabs>` — the authenticated mount point (the `(tabs)` group is gated behind a valid
  token by AuthContext). Additive only — no tab/tabBar/`TabIcon` change (MD-2). (ONB-5)
- **`(tabs)/settings.tsx`** gains an "Aide" `SectionCard` with a `secondary` `Button`
  `t('onboarding.replay')` ("Revoir le tutoriel") whose `onPress` calls
  `DeviceEventEmitter.emit(ONBOARDING_OPEN_EVENT)` — re-opens the tour regardless of the flag; the
  `settings.help` key was added (fr/en); theme/language/pseudo/logout flows untouched. (ONB-4)

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | SecureStore seen-flag util + RN OnboardingTour (7 i18next steps, auto-show, replay) + FR/EN strings | `a8870a1` | mobile/src/lib/onboarding.ts, mobile/src/components/OnboardingTour.tsx, mobile/src/i18n/translations/fr.ts, mobile/src/i18n/translations/en.ts |
| 2 | Mount in tabs layout + Settings "Revoir le tutoriel" | `d3c0bb4` | mobile/app/(tabs)/_layout.tsx, mobile/app/(tabs)/settings.tsx |

## Verification

- `cd mobile && npx tsc --noEmit` — clean (after each task).
- Grep gates:
  - `verygoodtrip.onboarding.seen` present in `mobile/src/lib/onboarding.ts`.
  - `onboarding` namespace present in both `fr.ts` and `en.ts`.
  - `serif|Instrument` → 0 matches in `OnboardingTour.tsx` (editorial display font only, D-11).
  - `OnboardingTour` → 1 mount in `(tabs)/_layout.tsx`.
  - `DeviceEventEmitter` + `ONBOARDING_OPEN_EVENT` present in `(tabs)/settings.tsx`.
- Manual smoke (Wave 2 checkpoint): first authed load with an unset flag shows the tour; finishing
  sets the flag; reopening the app does not reshow; Settings "Revoir le tutoriel" re-opens it; FR + EN render.

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered; no new dependency added (RN
`Modal` + `DeviceEventEmitter` + `expo-secure-store` were all already present — threat T-08-02-SC held).

## Threat Surface

No new security-relevant surface beyond the plan's `<threat_model>`. The seen flag is a non-sensitive
cosmetic boolean keyed by the user's own id (already in their JWT), stored encrypted in SecureStore on
the user's own device; `/auth/me` is an existing authenticated read (JWT auto-injected by the axios
client); the replay `DeviceEventEmitter` event is app-local and opens a read-only UI overlay carrying
no payload. All registered threats remain `accept` (cosmetic) / `mitigate` (no installs).

## Known Stubs

None — the tour is fully wired (auto-show, persistence, replay) with no placeholder data sources.

## Self-Check: PASSED

- FOUND: mobile/src/lib/onboarding.ts
- FOUND: mobile/src/components/OnboardingTour.tsx
- FOUND: commit a8870a1
- FOUND: commit d3c0bb4
