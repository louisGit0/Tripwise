---
phase: 06-polish-account
plan: 02
subsystem: web
tags: [web, trips, settings, share, profile, editorial-dark, POL-01, POL-02, POL-03]
requires:
  - "PATCH /api/v1/users/me (06-01) — JWT-guarded display_name edit returning the profile"
  - "Editorial-dark atoms: CTAButton, Input, SectionCard, Eyebrow, Hairline, Skeleton, FuelBadge, DataBar"
  - "ToastProvider useToast(); apiClient (@/lib/api); UserProfile / SavedTrip / PendingTripSession types"
provides:
  - "Web trip result + detail without the toll réel/≈ estimé badge (amount + breakdown kept)"
  - "Web trip result Partager action (navigator.share + clipboard fallback, toll-inclusive FR summary)"
  - "Web Settings editable pseudo persisting via PATCH /users/me with immediate reflect + toast"
affects:
  - "Completes the POL-01/02/03 web slice; mobile slice (06-03) mirrors the same three changes"
tech-stack:
  added: []
  patterns:
    - "navigator.share with AbortError swallow + navigator.clipboard.writeText fallback (project share pattern)"
    - "Single-field profile edit via apiClient.patch<UserProfile>('/users/me', { displayName }) → setUserProfile + reseed"
    - "Editorial-dark visual-layer-only change (MD-2) — no flow/data-shape change; tollIsEstimate kept in data"
key-files:
  created:
    - ".planning/phases/06-polish-account/06-02-SUMMARY.md"
  modified:
    - "web/src/app/app/trips/result/page.tsx"
    - "web/src/app/app/trips/[id]/page.tsx"
    - "web/src/app/app/settings/page.tsx"
decisions:
  - "D-27 — web POL-01/02/03: toll badge removed (amount kept), result Partager via navigator.share + clipboard, Settings pseudo editable via PATCH /users/me"
metrics:
  duration: "~12min"
  tasks: 3
  files: 3
  completed: "2026-06-02"
---

# Phase 6 Plan 02: Web POL-01/02/03 — Toll Badge Removal + Trip Share + Editable Pseudo Summary

Three editorial-dark, visual-layer web refinements (MD-2): the redundant toll **réel/≈ estimé**
badge is removed from the trip result and saved-trip detail (the toll amount + the énergie/péage
`DataBar` stay, and `tollIsEstimate` keeps flowing through the data); the result page gains a
**Partager** action that shares a toll-inclusive FR summary via `navigator.share` with a
`navigator.clipboard` fallback; and the Settings pseudo becomes an **editable** field persisting via
the 06-01 `PATCH /users/me`, reflecting immediately with a success toast. `tsc --noEmit` clean,
`next build` green across all 18 routes.

## What Was Built

- **POL-01 — toll badge removed (result + detail).**
  - `result/page.tsx`: deleted the `tollBadge` constant (the `Tooltip`>`Pill` block), dropped
    `badge: tollBadge` from the PÉAGES metrics tile, removed the `{tollBadge}` reference in the Péage
    legend, removed the now-unused local `tollIsEstimate`, the `badge` plumbing (the `badge?: ReactNode`
    field on the metrics type, the `badge` destructure, the `{badge}` render), and the now-unused
    `Pill`/`Tooltip` imports plus the `ReactNode` type import. `hasToll`, the `DataBar`, the PÉAGES
    tile value, the Péage legend amount, and the entire `handleSave` payload (still sending
    `tollIsEstimate: session.result.tollIsEstimate`) are untouched.
  - `[id]/page.tsx`: deleted the `Tooltip`>`Pill` block inside the Péage legend (kept the dot +
    `Péage · {fmtEur.format(trip.tollsCost)}` line and the `DataBar`), removed the `Pill`/`Tooltip`
    imports, and refreshed the stale legend comment (it no longer mentions the removed badge strings).
    `trip.tollIsEstimate` remains a field on the trip object — it simply stops being rendered.
- **POL-02 — Partager on the result page.** Added `handleShare` (declared in the render body so it
  closes over the already-computed `totalCost`/`energyCost`/`tollCost`/`hasToll`/`fmtEur`) and a
  **Partager** `CTAButton` (`variant="ghost"`, `size="lg"`, full width, lucide `Share2`) in the CTA
  block beside "Nouveau trajet". The FR summary is a route line (`from → to`, each label's pre-comma
  segment like the header), `Coût total : {fmtEur.format(totalCost)}` (toll-INCLUSIVE), an
  `Énergie {…}` (+ ` · Péage {…}` only when `hasToll`) breakdown, `{km} km · {formatDuration(s)}`, and
  a trailing `Calculé avec verygoodtrip`. All currency via the existing `fmtEur` (FR comma). Flow:
  feature-check `navigator.share` → `await navigator.share({ title, text })` inside try/catch that
  swallows `AbortError` (user cancel = no-op); on any other failure or when share is absent, fall back
  to `await navigator.clipboard.writeText(text)` + `showToast('success', 'Résumé copié dans le presse-papiers')`.
- **POL-03 — editable pseudo in Settings.** Replaced the read-only `displayName` paragraph in the
  Account `SectionCard` with an `Input` (label "Pseudo", `maxLength={40}`) bound to a new `displayName`
  state seeded from `userProfile.displayName ?? ''` in the existing `/auth/me` effect, plus an
  **Enregistrer** `CTAButton` (`variant="accent"`, `size="md"`, disabled while empty). `handleSaveName`
  trims + guards against empty, sets a saving flag, calls
  `apiClient.patch<UserProfile>('/users/me', { displayName })`, then `setUserProfile(data)` + reseeds
  the input + `showToast('success', 'Pseudo mis à jour')` (error → `showToast('error', …)`). The email
  line stays read-only; a `Skeleton` shows until the profile loads; the theme picker, hydration
  skeleton, and logout flow are unchanged (MD-2).

## How It Works

The toll amount and énergie/péage breakdown remain authoritative on result + detail; only the
per-line estimate badge (redundant with the "COÛT ESTIMÉ" hero label) is gone. On the result page,
Partager hands a plain-text, toll-inclusive FR summary to the OS share sheet when available and
otherwise copies it to the clipboard — never throwing on a missing API or a user-cancel. In Settings,
saving the pseudo sends only `{ displayName }` to the JWT-guarded `PATCH /users/me`; the handler
(06-01) derives the target id from the token, validates/trims/length-bounds server-side, and returns
the profile, which the page writes straight back into local state for an immediate reflect.

## Verification

| Check | Result |
|-------|--------|
| `cd web && npx tsc --noEmit` | PASS (0 errors) — run after each task |
| `cd web && npm run build` | PASS — Compiled successfully, **18/18 routes**, 0 ESLint errors |
| grep `Pill`/`Tooltip`/`réel`/`≈ estimé` in `web/src/app/app/trips/**` | 0 matches |
| grep `navigator.share` in result page | present |
| grep `navigator.clipboard` in result page | present |
| grep `apiClient.patch<UserProfile>('/users/me'` in settings page | present (line 50) |

Success criteria met: no toll badge on web result/detail (amount + breakdown preserved); result page
shares a toll-inclusive FR summary via navigator.share with a clipboard fallback; Settings pseudo is
editable and persists via PATCH /users/me, updating the UI immediately; editorial-dark atoms/tokens
reused; save/logout/theme flows preserved.

## Threat Model Outcome

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-06-02-01 (Tampering / Settings pseudo edit) | mitigate | Client sends only `{ displayName }`; authz + validation/length-bound enforced server-side by PATCH /users/me (06-01). Value rendered as escaped React text — no HTML sink. |
| T-06-02-02 (Info disclosure / share summary) | accept | Shared text is only the user's own route/cost figures they chose to share; no token/PII beyond what is on screen. |
| T-06-02-03 (DoS-UX / navigator.share absent) | mitigate | Feature-check + clipboard fallback + AbortError swallow — a missing API or user-cancel never throws an unhandled rejection. |
| T-06-02-SC (npm installs) | accept | No package installs (Share2 from existing lucide-react; navigator APIs browser-native). |

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered. (The `badge` plumbing on the
metrics type/render was fully removed since no remaining tile uses it, the cleaner option the plan
permitted, keeping `next build` ESLint clean.)

## Known Stubs

None.

## Threat Flags

None — no new security surface beyond the planned share text and the already-built PATCH /users/me.

## Self-Check: PASSED

- Files present: `web/src/app/app/trips/result/page.tsx`, `web/src/app/app/trips/[id]/page.tsx`,
  `web/src/app/app/settings/page.tsx` — all FOUND.
- Commits present: `c7b0f37` (Task 1 — badge removal), `fd7ae32` (Task 2 — share),
  `bff1790` (Task 3 — editable pseudo) — all FOUND.
