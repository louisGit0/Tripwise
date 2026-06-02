---
phase: 06-polish-account
plan: 01
subsystem: backend
tags: [users, profile, auth, dto, e2e, tdd, POL-03]
requires:
  - "Existing JwtAuthGuard + @CurrentUser() decorator (auth module)"
  - "Global ValidationPipe (whitelist + forbidNonWhitelisted + transform) in main.ts"
  - "User.displayName / display_name column (already exists — no migration)"
provides:
  - "PATCH /api/v1/users/me — JWT-guarded display_name edit returning the profile"
  - "UpdateProfileDto (trimmed, bounded displayName)"
  - "UsersService.updateProfile(userId, displayName)"
  - "backend/test/users.e2e-spec.ts (7 cases)"
affects:
  - "Unblocks web 06-02 + mobile 06-03 Settings pseudo-edit UI (Wave 2)"
tech-stack:
  added: []
  patterns:
    - "JWT guard + @CurrentUser() id-from-token (IDOR-safe write)"
    - "Single-field DTO + global whitelist = only displayName writable"
    - "class-transformer @Transform trim before class-validator runs"
    - "service update + findOneByOrFail (mirrors linkOAuthProvider)"
key-files:
  created:
    - "backend/test/users.e2e-spec.ts"
    - "backend/src/users/dto/update-profile.dto.ts"
  modified:
    - "backend/src/users/users.service.ts"
    - "backend/src/users/users.controller.ts"
decisions:
  - "D-26 — PATCH /users/me edits display_name only; id from @CurrentUser (IDOR-safe); no migration"
metrics:
  duration: "~15min"
  tasks: 2
  files: 4
  completed: "2026-06-02"
---

# Phase 6 Plan 01: Backend POL-03 — Edit Pseudo (PATCH /users/me) Summary

JWT-guarded `PATCH /api/v1/users/me` that trims + length-bounds (1–40) and updates only the
authenticated user's `display_name`, returning the `/auth/me` profile shape (no `passwordHash`);
IDOR-safe and whitelist-locked to a single field. Built TDD (failing e2e → implementation), no
migration. This is the backend half of POL-03 and unblocks the web + mobile Settings UI (Wave 2).

## What Was Built

- **`UpdateProfileDto`** (`backend/src/users/dto/update-profile.dto.ts`) — one field `displayName`:
  `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` runs first so
  validation sees the trimmed value, then `@IsString()` + `@IsNotEmpty()` + `@MaxLength(40)`. Because
  it is the only declared field, the global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`)
  rejects any other key — `displayName` is the sole writable property.
- **`UsersService.updateProfile(userId, displayName)`** — `userRepo.update(userId, { displayName })`
  then `userRepo.findOneByOrFail({ id: userId })`, mirroring the existing `linkOAuthProvider`. It only
  ever takes the current user's id and the new pseudo — never an arbitrary target id.
- **`UsersController` `@Patch('me')`** — `@UseGuards(JwtAuthGuard)`, `updateMe(@CurrentUser() user, @Body() dto)`
  calls `usersService.updateProfile(user.id, dto.displayName)` and returns the SAME projection as
  `GET /auth/me`: `{ id, email, displayName, locale, provider, createdAt }` (no `passwordHash`).
  Final path `/api/v1/users/me` (existing `@Controller('users')` + global `api/v1` prefix).
- **`backend/test/users.e2e-spec.ts`** — clones the `auth.e2e-spec.ts` SQLite in-memory harness
  (same entities, prefix, ValidationPipe, OAuth strategy stubs; tokens via `POST /auth/register`).
  7 cases: update → 200 + profile; trim `'  Trim Me  '` → `'Trim Me'`; `''` → 400; `'   '` → 400;
  41-char → 400; no token → 401; `{ displayName, email }` → 400 + follow-up `/auth/me` email unchanged.

## How It Works

A client sends `PATCH /api/v1/users/me { displayName }` with a Bearer JWT. `JwtAuthGuard` populates
`request.user`; `@CurrentUser()` extracts it. The global `ValidationPipe` transforms the body into
`UpdateProfileDto` (trimming `displayName`) and validates it — blank/whitespace-only/>40 or any extra
key is rejected with 400 before the handler runs. The handler passes `user.id` (never a body-supplied
id) to `updateProfile`, which persists only `display_name` and reloads the row, then the controller
returns the standard profile projection.

## TDD Gate Compliance

- RED commit `086ed94` — `test(06-01): add failing e2e for PATCH /users/me` (suite ran and failed,
  route absent → 404/expected-200 mismatch + whitelist email assertion).
- GREEN commit `191b252` — `feat(06-01): implement JWT-guarded PATCH /users/me` (all 7 cases pass).
- No REFACTOR commit needed (implementation was minimal and clean).

## Verification

| Check | Result |
|-------|--------|
| `cd backend && npx tsc --noEmit` | PASS (0 errors) |
| `cd backend && npx nest build` | PASS (dist emitted) |
| `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="users" --forceExit` | PASS — 10 suites, **157/157** tests (7 new users cases green, no regressions) |

Success criteria met: update + trim returns profile; 401 without token; 400 on
empty/whitespace/too-long/unknown fields; only `display_name` mutated; no migration.

## Threat Model Outcome

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-06-01-01 (IDOR) | mitigate | Handler derives target id from `@CurrentUser().id` only; no `:id`/`userId` accepted. e2e exercises the authed flow. |
| T-06-01-02 (Tampering / extra field) | mitigate | Single-field DTO + `forbidNonWhitelisted`; e2e sends `{displayName, email}` → 400 + `/auth/me` email unchanged. |
| T-06-01-03 (Tampering / blank-or-oversized value) | mitigate | `@Transform` trim + `@IsNotEmpty` + `@MaxLength(40)`; value rendered as escaped text by React/RN (no HTML sink) — length-bound + trim is the appropriate control. |
| T-06-01-04 (Spoofing) | mitigate | `@UseGuards(JwtAuthGuard)`; e2e asserts 401 without a token. |
| T-06-01-SC (npm installs) | accept | No package installs in this plan. |

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered.

## Known Stubs

None.

## Threat Flags

None — no new security surface beyond the planned endpoint.

## Self-Check: PASSED

- Files present: `backend/test/users.e2e-spec.ts`, `backend/src/users/dto/update-profile.dto.ts`,
  `backend/src/users/users.service.ts`, `backend/src/users/users.controller.ts` — all FOUND.
- Commits present: `086ed94` (RED), `191b252` (GREEN) — both FOUND.
