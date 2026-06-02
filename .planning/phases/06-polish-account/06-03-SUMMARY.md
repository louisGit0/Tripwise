---
phase: 06-polish-account
plan: 03
subsystem: mobile
tags: [mobile, expo, dashboard, settings, share, profile, editorial-dark, POL-01, POL-02, POL-03]
requires:
  - "PATCH /api/v1/users/me (06-01) — JWT-guarded display_name edit returning the profile"
  - "GET /api/v1/auth/me — profile read ({ id, email, displayName, locale, provider, createdAt })"
  - "Editorial-dark mobile atoms: SectionCard, Eyebrow, Input, Button, DataBar, AnimatedCounter"
  - "mobile api client default export (axios, JWT auto-injected); react-native-toast-message; react-native Share"
provides:
  - "Mobile dashboard trip result without the toll réel/≈ estimé badge (amount + énergie/péage DataBar kept)"
  - "Mobile dashboard share: enriched FR summary (route + toll-inclusive total + breakdown + distance/durée)"
  - "Mobile Settings editable pseudo persisting via PATCH /users/me with success toast (seeded from /auth/me)"
affects:
  - "Completes the POL-01/02/03 mobile slice; mirrors the web slice (06-02). Closes Phase 6."
tech-stack:
  added: []
  patterns:
    - "RN Share.share with a multi-line interpolated i18n template (route/cost/breakdown/distance/duration)"
    - "Single-field profile edit: client.patch('/users/me', { displayName }) → reseed + Toast (mirrors web)"
    - "Seed editable field from GET /auth/me on mount (unmount-guarded), AuthContext holds no profile"
    - "Editorial-dark visual-layer-only change (MD-2) — no flow/data-shape change; tollIsEstimate kept in data"
key-files:
  created:
    - ".planning/phases/06-polish-account/06-03-SUMMARY.md"
  modified:
    - "mobile/app/(tabs)/dashboard.tsx"
    - "mobile/app/(tabs)/settings.tsx"
    - "mobile/src/i18n/translations/fr.ts"
    - "mobile/src/i18n/translations/en.ts"
decisions:
  - "D-28 — mobile POL-01/02/03: toll badge removed (amount kept), enriched share summary, Settings pseudo editable via PATCH /users/me; closes Phase 6"
metrics:
  duration: "~10min"
  tasks: 3
  files: 4
  completed: "2026-06-02"
---

# Phase 6 Plan 03: Mobile POL-01/02/03 — Toll Badge Removal + Enriched Share + Editable Pseudo Summary

Three editorial-dark, visual-layer mobile refinements (MD-2) mirroring the web slice (06-02): the
redundant toll **réel/≈ estimé** badge is removed from the dashboard `ResultCard` (the toll amount +
the énergie/péage `DataBar` stay, and `tollIsEstimate` keeps flowing through the data); the existing
`handleShare` is enriched so the shared FR summary now carries the **route + toll-inclusive total +
énergie/péage breakdown + distance/durée**; and the Settings screen gains an **editable pseudo**
field persisting via the 06-01 `PATCH /users/me`, seeded from `GET /auth/me`, reflecting immediately
with a success toast. Mobile `npx tsc --noEmit` clean after every task.

## What Was Built

- **POL-01 — toll badge removed (dashboard ResultCard).** Deleted the `tollBadge` constant (the
  `TouchableOpacity`>`Pill` block whose `onPress` opened an `Alert.alert` tooltip) and its single
  `{tollBadge}` reference in the Péage legend, plus the now-unused local `tollIsEstimate`. Removed the
  `Pill` import and the `Alert` import from `react-native` (each was used only by the badge);
  `TouchableOpacity` stays (vehicle chips + charging-mode buttons still use it). Kept: `hasToll`,
  `tollCost`, the `DataBar`, and the Péage legend amount line
  `{t('dashboard.tollLabel')} · {formatEur(tollCost)}`. `result.tollIsEstimate` remains a field on
  the data (types unchanged) — it simply stops being rendered. The stale `ResultCard` JSDoc was
  updated to reflect the removal. The `Pill` atom stays in the codebase for other screens.
- **POL-02 — enriched share summary.** `dashboard.shareText` in **both** `fr.ts` and `en.ts` was
  rewritten as a clean multi-line template interpolating `{{route}}` / `{{cost}}` / `{{breakdown}}` /
  `{{distance}}` / `{{duration}}` and ending with `Calculé avec verygoodtrip` / `Calculated with
  verygoodtrip` (symmetric). `handleShare` now composes: `route = \`${origin?.label ?? '—'} →
  ${destination?.label ?? '—'}\``; `cost = formatEur(energyCost + tollCost)` (toll-INCLUSIVE, FR comma —
  matches the hero total); a `breakdown` string of `t('dashboard.energyLabel')` + `formatEur(energyCost)`,
  appending ` · ` + `t('dashboard.tollLabel')` + `formatEur(tollCost)` **only when `result.tollCost !=
  null && > 0`**; `distance = \`${result.distance.km} km\``; `duration = result.duration.formatted`. All
  five are passed to `Share.share({ message: t('dashboard.shareText', { route, cost, breakdown,
  distance, duration }) })`. No new share button (the existing ghost "Partager" Button is reused); no
  new packages (`Share` from `react-native`).
- **POL-03 — editable pseudo in Settings.** Added a new `SectionCard` titled `t('settings.pseudo')`
  (placed just above the existing Account/logout section) containing an `Input` (`maxLength={40}`,
  `autoCapitalize="words"`) bound to a `displayName` state + an **Enregistrer** `Button` (`size="sm"`,
  disabled while the trimmed value is empty, `loading={savingName}`). On mount, an unmount-guarded
  effect calls `client.get<ProfileResponse>('/auth/me')` and seeds `displayName` from
  `data.displayName ?? ''` (AuthContext holds no profile). `handleSaveName` trims + guards empty, sets a
  saving flag, calls `client.patch('/users/me', { displayName: trimmed })`, reseeds from the typed
  response, and fires `Toast.show({ type: 'success', text1: t('settings.pseudoSaved') })` (error →
  `t('common.error')`). New i18n keys `settings.pseudo` / `pseudoSave` / `pseudoSaved` added to both
  `fr.ts` (Pseudo / Enregistrer / Pseudo mis à jour) and `en.ts` (Display name / Save / Display name
  updated). Theme, language, logout, and `version` sections are untouched (MD-2).

## How It Works

The toll amount and énergie/péage breakdown remain authoritative on the dashboard result; only the
redundant per-line estimate badge (the cost is already labelled "Coût estimé" in the hero) is gone.
Sharing hands a plain-text, toll-inclusive FR summary to the native OS share sheet whose figures
match exactly what the user sees. In Settings, saving the pseudo sends only `{ displayName }` to the
JWT-guarded `PATCH /users/me`; the 06-01 handler derives the target id from the token,
validates/trims/length-bounds server-side (1–40), and returns the profile, which the screen writes
straight back into local state for an immediate reflect.

## Verification

| Check | Result |
|-------|--------|
| `cd mobile && npx tsc --noEmit` | PASS (0 errors) — run after each task + final |
| grep `import { Pill }` / `<Pill` in dashboard.tsx | 0 (only a JSDoc reference to the removed badge) |
| grep `Share.share` in dashboard.tsx | present (line 107) |
| grep Péage legend amount `tollLabel') } · {formatEur(tollCost)` in dashboard.tsx | present (intact) |
| grep `{{route}}`/`{{breakdown}}` in fr.ts AND en.ts | present, symmetric |
| grep `settings.pseudo`/`pseudoSave`/`pseudoSaved` in fr.ts AND en.ts | present, symmetric |
| grep `client.patch('/users/me'` + `/auth/me` in settings.tsx | both present |

Success criteria met: no toll badge on the mobile dashboard result (amount + breakdown preserved);
the share summary includes route + énergie/péage breakdown + the toll-inclusive FR total; the pseudo
is editable in Settings and persists via PATCH /users/me with a success toast; editorial-dark
atoms/tokens reused; calc/charging/vehicle/share/save-favorite + theme/language/logout flows preserved.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`); no task carried `tdd="true"`. Mobile has no test runner
(CLAUDE.md) — the only specified `<verification>` per task is `npx tsc --noEmit`, run GREEN after
each task. No RED/GREEN test commits are expected for this plan.

## Threat Model Outcome

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-06-03-01 (Tampering / Settings pseudo edit) | mitigate | Client sends only `{ displayName }`; authz + trim/length-bound enforced server-side by PATCH /users/me (06-01). Value rendered as RN `<Text>` (no HTML/markup sink). |
| T-06-03-02 (Info disclosure / share message) | accept | Shared text is only the user's own route/cost figures they chose to share; no token/PII beyond what is on screen. |
| T-06-03-03 (Spoofing / /auth/me + /users/me) | mitigate | The api client auto-injects the JWT; a 401 triggers token deletion via the existing response interceptor. |
| T-06-03-SC (npm installs) | accept | No package installs (Share, axios client, Input, Toast already present). |

## Deviations from Plan

None — plan executed exactly as written (Rules 1–4 not triggered). Two in-scope refinements after the
three tasks: the `client.patch` call was written without the axios generic (`client.patch('/users/me',
…)` + a typed `r.data as ProfileResponse` cast) so it matches the plan's literal key-link pattern
`client\.patch\(['"]/users/me`, and the now-stale `ResultCard` JSDoc was updated to describe the
badge removal. Both committed in `598458c`.

## Known Stubs

None.

## Threat Flags

None — no new security surface beyond the planned share text and the already-built PATCH /users/me.

## Self-Check: PASSED

- Files present: `mobile/app/(tabs)/dashboard.tsx`, `mobile/app/(tabs)/settings.tsx`,
  `mobile/src/i18n/translations/fr.ts`, `mobile/src/i18n/translations/en.ts` — all FOUND.
- Commits present: `c5a68a1` (Task 1 — badge removal), `8363534` (Task 2 — share),
  `26635af` (Task 3 — editable pseudo), `598458c` (polish) — all FOUND.
