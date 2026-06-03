---
phase: 09-ios-app-store-release
plan: 01
subsystem: release prep (account deletion + legal pages + iOS config + runbook)
tags: [ios, release, app-store, account-deletion, apple-5.1.1, eas]
outcome: agent-prep-complete (user-owned build/submit pending)
requirements: [REL-01]
key-files:
  created:
    - web/src/app/privacy/page.tsx
    - web/src/app/support/page.tsx
    - .planning/phases/09-ios-app-store-release/09-CONTEXT.md
    - .planning/phases/09-ios-app-store-release/09-01-RUNBOOK.md
  modified:
    - backend/src/users/users.controller.ts
    - backend/src/users/users.service.ts
    - backend/test/users.e2e-spec.ts
    - web/src/app/app/settings/page.tsx
    - mobile/app/(tabs)/settings.tsx
    - mobile/src/i18n/translations/fr.ts
    - mobile/src/i18n/translations/en.ts
    - mobile/app.config.ts
    - mobile/eas.json
metrics:
  completed: 2026-06-03
  backend_e2e: 162/162
  web: tsc 0 + build 20/20 (privacy + support static)
  mobile: tsc 0
  code_review: SHIP (0 Critical / 0 High; 1 Medium fixed)
---

# Plan 09-01 — iOS Release Prep

## What shipped (agent side)

### Wave 1 — App Review blockers closed
- **In-app account deletion** (Apple Guideline 5.1.1 (v) — required because Sign in with Apple is
  offered). `DELETE /api/v1/users/me`: JWT-guarded, `@CurrentUser` only (IDOR-safe, no id param),
  `@HttpCode(204)`, `userRepo.delete(id)` cascades via existing `onDelete: CASCADE` FKs on
  `user_vehicles` / `favorites` / `trips`. e2e: 401 no-token; 204 + stale token → 401 + email reusable.
  Web Settings + mobile Settings each gained a **"Supprimer mon compte"** danger zone (confirm
  Modal / Alert → delete → session teardown → leave). Stale-JWT auto-invalidates via the
  DB-backed `JwtStrategy`.
- **Legal pages on the web (Vercel)**: `/privacy` (RGPD: data collected, usage, third parties,
  retention, rights, contact; no ads/no tracking) + `/support` (FAQ + contact). These satisfy the
  Apple-required Privacy Policy URL and Support URL.

### Wave 2 — iOS config
- `app.config.ts`: `ios.infoPlist.ITSAppUsesNonExemptEncryption = false` (HTTPS-only → skips the
  export-compliance prompt) and `ios.supportsTablet = false` (iPhone-first v1.0 → no iPad
  screenshot requirement).
- `eas.json`: production build profile bound to `"environment": "production"` so the EAS
  production env vars (real API URL + Mapbox tokens) are injected — fixes the latent localhost
  fallback. `appleId` already set; `ascAppId`/`appleTeamId`/ASC API key left for the user.

### Deliverables for the user
- `09-CONTEXT.md` — locked decisions (D-36..D-45), App Privacy nutrition labels, App Store listing
  draft (FR), plan waves.
- `09-01-RUNBOOK.md` — step-by-step EAS + App Store Connect runbook (project link, prod env vars,
  ASC app record, ASC API `.p8` key, build, TestFlight smoke, submit, screenshots, demo account).

## Code review
gsd code-reviewer: **SHIP** — 0 Critical / 0 High. The single MEDIUM (misleading error toast when
the post-delete `logout()`/`signOut()` step fails even though the account is already gone) was
**fixed** on both surfaces by splitting the delete from a best-effort session teardown.

## Status — NOT yet released
Success criterion #1 ("an EAS production iOS build succeeds and the app is submitted to App Store
Connect") is **account/credential/Apple-gated** and owned by the user. All agent-preppable work is
done and verified. Next: the user executes `09-01-RUNBOOK.md` (EAS build → submit → Apple review).
Phase 9 stays **in progress** until the build/submit is confirmed.
