---
phase: 05-mobile-tolls-editorial-redesign
plan: 04
subsystem: mobile-auth
tags: [mobile, editorial-dark, auth, oauth, expo-router, restyle]
requires:
  - "shared editorial-dark tokens (05-01)"
  - "mobile editorial fonts + normalized atoms (05-02)"
  - "Eyebrow atom (05-03)"
provides:
  - "Editorial-dark mobile login screen (Wordmark + Eyebrow + Input + accent Button + secondary OAuth)"
  - "Editorial-dark mobile register screen (zod confirm-password refine preserved)"
  - "Editorial-dark tab bar (accent active / mutedText inactive / surface bg / hairline border)"
  - "Editorial auth Stack content background"
affects:
  - "mobile/app/(auth)/login.tsx"
  - "mobile/app/(auth)/register.tsx"
  - "mobile/app/(auth)/_layout.tsx"
  - "mobile/app/(tabs)/_layout.tsx"
tech-stack:
  added: []
  patterns:
    - "Consume editorial tokens directly (bg/ink/mutedText/hairline/accent) instead of legacy aliases"
    - "Eyebrow atom for auth subtitle surtitle"
    - "2-weight typography (400/700) + display font; no serif (D-11)"
key-files:
  created:
    - ".planning/phases/05-mobile-tolls-editorial-redesign/05-04-SUMMARY.md"
  modified:
    - "mobile/app/(auth)/login.tsx"
    - "mobile/app/(auth)/register.tsx"
    - "mobile/app/(auth)/_layout.tsx"
    - "mobile/app/(tabs)/_layout.tsx"
decisions:
  - "Used the Eyebrow atom (uppercase, display 700, muted) for the auth subtitle rather than a plain muted Text — brings editorial surtitle character with zero new styling."
  - "Switch links + divider 'ou' use the display font at weight 700 (2-weight system) — accent for links, mutedText for the divider label."
  - "Added contentStyle.backgroundColor=bg to the auth Stack so the stack paints editorial before a screen mounts (plan's optional)."
  - "Left the TabIcon stub (returns null) untouched — swapping to @expo/vector-icons risks the Expo-Go-safe constraint; out of MD-2 scope."
metrics:
  duration: ~7min
  completed: "2026-06-02"
  tasks: 2
  files: 4
---

# Phase 5 Plan 04: Editorial-Dark Auth Screens + Layouts Summary

Login + register screens and the auth/tab layouts now wear the editorial-dark direction (editorial tokens, Wordmark + Eyebrow header, normalized Input/Button atoms, Space Grotesk 700, no serif) with every auth/OAuth/zod/navigation flow preserved verbatim (MOB-01, MD-2). Mobile `tsc --noEmit` is fully GREEN.

## What Was Built

### Task 1 — Editorial-dark login + register (commit `80d76c8`)
- **Color tokens:** every legacy alias the screens read (`background`, `text`, `textSecondary`, `border`, `mutedFg`, `primary`) was repointed to the canonical editorial tokens (`bg`, `ink`, `mutedText`, `hairline`, `accent`). `useColorScheme()` default flipped to `'dark'` (editorial-dark first paint).
- **Header:** `Wordmark` in editorial `ink` + the subtitle now rendered through the `Eyebrow` atom (`auth.login` / `auth.register`) — display font 700, uppercase, wide tracking, muted.
- **Form:** unchanged — the normalized `Input` atom (already editorial) and the accent `Button` submit; on login the Google OAuth option keeps the quiet `secondary` Button variant.
- **Divider / links:** divider line → `hairline`, "ou" → `mutedText`; the login↔register switch links → `accent` text. All use the display font weight 700.
- **Typography cleanup:** removed the unused `title` style (`fontWeight: '800'`); no 500/600/800 weights remain; no serif (D-11).
- **Logic preserved (MD-2):** `onSubmit` POST `/auth/login` & `/auth/register`, `signIn`, `handleGoogleLogin` + `WebBrowser.openAuthSessionAsync('verygoodtrip://auth/callback')`, the register zod `.refine` confirm-password match + password error mapping, `secureTextEntry` on password/confirm, and the `Link` navigation — all verbatim.

### Task 2 — Editorial-dark auth + tab layouts (commit `d4dd5ee`)
- **Tab bar** (`(tabs)/_layout.tsx`): `tabBarActiveTintColor` → `accent`, `tabBarInactiveTintColor` → `mutedText`, `tabBarStyle.backgroundColor` → `surface`, `borderTopColor` → `hairline`. `headerShown:false`, the 4 `Tabs.Screen` entries + titles + the `TabIcon` stub + navigation structure are unchanged (MD-2).
- **Auth Stack** (`(auth)/_layout.tsx`): kept `headerShown:false`; added `contentStyle.backgroundColor = bg` so the auth stack is editorial even before a screen paints. No route/flow changes.

## Deviations from Plan

None - plan executed exactly as written (Rules 1-4 not triggered).

## Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` per-file (auth screens) | auth screens clean |
| `tsc --noEmit` per-file (layouts) | layouts clean |
| `tsc --noEmit` full mobile run | 0 errors (GREEN) |
| No legacy blue literals / weights 500/600/800 in the 4 files | confirmed (only 400/700 + display font) |
| Auth/OAuth/navigation behavior | unchanged (visual-layer-only diff) |

## Threat Surface

No new security surface. Threat register dispositions held: `secureTextEntry` preserved on password + confirm fields (T-05-04-02); the `openAuthSessionAsync` OAuth redirect + token handling untouched (T-05-04-01). No logging added.

## Notes for Next Plans

- The auth surface is now editorial. Remaining Wave-3 screens (dashboard, vehicles/garage, favorites, settings) still consume legacy aliases and need the same token repoint + atom/Eyebrow adoption.
- The dashboard result must render the toll breakout (MOB-02) via `AnimatedCounter` + `DataBar` Variant A + the réel/≈ estimé `Pill`, using `TripResult.tollCost`/`tollIsEstimate` + the seeded `dashboard.{tollLabel,tollReal,tollEstimate,…}` i18n.
- `TabIcon` is still a `null`-returning stub (label-only tabs) — swap to `@expo/vector-icons` once a native/EAS build is verified; keep the label fallback (Expo-Go safe).

## Self-Check: PASSED
