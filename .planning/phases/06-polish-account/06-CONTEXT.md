---
phase: 06-polish-account
type: context
source: user feedback (v1.1, 2026-06-02)
requirements: [POL-01, POL-02, POL-03]
---

# Phase 6 Context — Polish & Account

## Domain

Three small, high-value refinements from the v1.0 review, each shipping **web AND mobile**:
remove the redundant toll "estimé" badge, add trip sharing, and let users edit their pseudo
(`display_name`) from Settings. Editorial-dark language is locked (v1.0) — reuse it.

## Decisions (locked, from user feedback)

- **POL-01 — Remove the toll réel/≈ estimé badge.** The cost is already labelled "COÛT ESTIMÉ", so the
  per-line toll badge is redundant. Remove the badge (Pill + its tooltip) from the toll line/tile,
  **keep the toll amount** in the breakdown.
  - Web: `web/src/app/app/trips/result/page.tsx` + `web/src/app/app/trips/[id]/page.tsx` (the Pill+Tooltip on the péage line).
  - Mobile: `mobile/app/(tabs)/dashboard.tsx` (the ResultCard legend Pill + the PÉAGES tile badge).
  - Keep the `tollIsEstimate` data flowing (don't rip out the field) — only remove the visual badge. The `Tooltip` atom / `Pill` stay in the codebase for other uses.
- **POL-02 — Trip share.** A user can share a calculated trip (clean FR summary: route, total cost, energy + toll breakdown, distance/duration).
  - Mobile: `handleShare` (Share.share) already exists on the dashboard — keep/clean it; ensure the shared text matches the displayed (toll-inclusive) total + FR comma.
  - Web: NO share today → add a "Partager" action on the result page using `navigator.share` with a clipboard fallback (the project pattern); same FR summary.
- **POL-03 — Edit pseudo (display_name) in Settings.** No migration — `User.display_name` already exists.
  - Backend: add a JWT-guarded `PATCH /users/me` (or `/auth/me`) accepting `{ displayName }` (validated, length-bounded, trimmed) → updates the current user, returns the updated profile. `users.controller.ts` exists but is empty; wire `UsersService` + a DTO.
  - Web: `web/src/app/app/settings/page.tsx` — turn the read-only display_name into an editable field (Input + save), `apiClient.patch`, toast on success.
  - Mobile: `mobile/app/(tabs)/settings.tsx` — same edit field via the api client.

## Scope Fence

**In:** the 3 items above (web + mobile + the one backend endpoint). Reuse locked editorial-dark
atoms/tokens. Keep all existing flows.

**Out:** showroom (Phase 7), onboarding (Phase 8), release (Phase 9); no migration; no design-system
changes; no new toll/catalog logic.

## Success Criteria

1. No toll réel/≈ estimé badge on web result/detail or mobile dashboard result; toll amount remains.
2. A user can share a calculated trip from web and mobile (toll-inclusive FR summary).
3. A user can edit their pseudo in Settings (web + mobile), persisted via `PATCH /users/me`
   (`display_name`), reflected immediately; backend e2e covers it.

## Notes / Open

- Endpoint path: prefer `PATCH /users/me` (RESTful; controller exists) over overloading `/auth/me`.
  Mirror the existing JWT guard + `@CurrentUser()` + global ValidationPipe DTO pattern.
- Web share summary helper can be shared logic; mobile mirrors it (RN `Share.share`).
- Backend e2e: SQLite in-memory pattern (mirror existing auth/users e2e).
