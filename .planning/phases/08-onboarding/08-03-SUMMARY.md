---
phase: 08-onboarding
plan: 03
subsystem: verification / onboarding checkpoint
tags: [onboarding, checkpoint, human-verify]
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

# Plan 08-03 — Onboarding Checkpoint Outcome

## Result: APPROVED

User validated the onboarding tutorial (web + mobile): 7-step editorial-dark carousel, auto-shown once
after signup (per-user seen flag), replayable from Settings → "Revoir le tutoriel", focus-trap +
scroll-lock + reduced-motion on web. ("Validé.")

## Automated gate
- Code review (08-REVIEW.md): **0 Critical** (seen-flag logic, leak guards, no-reshow, MD-2 all verified);
  WR-01 (mobile replay flag via idRef) + WR-02/03 (web modal focus-trap/scroll-lock/restore) fixed (commit 03f0340).
- web tsc + build 18/18; mobile tsc green.

## Requirement
- ONB-01 delivered (web + mobile): post-signup tutorial explaining the app + each screen, persisted
  "seen" (no auto-reshow), replayable from Settings.

## Also confirmed at this checkpoint — SHOW-02 photos now LIVE (Phase 7 follow-up)
The user added `CARIMAGES_API_KEY` to Render. Vehicle photos required two fixes after the key was set:
- **07-05** secure byte-proxy (commit ad29794): the CarImages signed URL embeds + requires the api_key,
  so returning it would leak the key → the backend now PROXIES the image bytes (key server-side; client
  gets webp bytes or 204→placeholder). Web blob fetch / mobile RN Image with Authorization header.
- **Auth fix** (commit 0cb4846): CarImages `signed-url` rejects a Bearer header → key must go in the
  `api_key` query param. After this, real photos resolve (verified live: `Volkswagen/Polo 1.0 TSI 95`
  → 200 image/webp). Key never reaches the app client; never committed (backend/.env + Render env only).

## Outcome
Onboarding approved + photos live. **Phase 8 complete.** v1.1 remaining: **Phase 9 — iOS App Store
release** (the final phase; Apple Developer account-gated).
