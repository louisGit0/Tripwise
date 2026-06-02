---
phase: 03-web-redesign-rollout
plan: 02
subsystem: web-ui
tags: [editorial-dark, landing, auth, oauth, typography, focus, restyle]
requires:
  - "Normalized ui/ atoms from 03-01 (CTAButton/Input/SectionCard/Pill/Eyebrow/Hairline/Wordmark/TWAppIcon — 2-weight 400/700 + canonical accent focus)"
provides:
  - "Restyled editorial-dark public surfaces: landing / + auth /login /register /auth/callback/{google,apple}"
  - "Landing text-display 700 headline (NO serif) + CTAButton hero/header CTAs"
  - "Login/register with normalized Input + accent CTAButton + quiet 400-weight OAuth options on canonical focus"
affects:
  - "Cluster A of Phase 3 rollout complete; remaining clusters (B dashboard / C garage / D trips / E fuel+settings) are independent page files"
tech-stack:
  added: []
  patterns:
    - "Navigation CTA = <Link href><CTAButton …></CTAButton></Link> (mirrors dashboard:309)"
    - "Hand-rolled link focus = canonical token focus-visible:ring-carbon-accent/50 ring-offset-2 ring-offset-carbon-bg"
    - "Typography mapping: title text-4xl/5xl→text-display (inherit globals h1 700); meta→text-caption; body→text-sm"
key-files:
  created: []
  modified:
    - web/src/app/page.tsx
    - web/src/app/login/page.tsx
    - web/src/app/register/page.tsx
decisions:
  - "OAuth callback pages (google/apple) left untouched — already token-correct (text-carbon-muted/accent, no font-medium/semibold) with transform-based LoaderCircle animate-spin spinner and intact Suspense + token/redirect logic; editing would add churn with no contract change (MD-2)"
  - "Header 'Se connecter' kept as a plain text link (not CTAButton) with canonical focus — reads as a quiet header action; the 3 required CTAButton instances are header 'Créer un compte' + both hero CTAs"
metrics:
  duration: ~8min
  completed: 2026-06-02
  tasks: 2
  files: 3
---

# Phase 3 Plan 02: Cluster A — Landing + Auth Editorial-Dark Restyle Summary

Restyled the public surfaces — landing `/` and the auth screens (`/login`, `/register`, `/auth/callback/{google,apple}`) — into the locked editorial-dark language by composing the 03-01-normalized atoms + tokens: a Space Grotesk 700 `text-display` headline (no serif, D-11), `CTAButton` hero/header CTAs, normalized `Input` fields, and quiet 400-weight OAuth options on the single canonical accent focus ring. Visual layer only (MD-2) — every auth/OAuth flow, the zod `confirmPassword` `.refine`, and the OAuth callback token/redirect logic are preserved byte-for-byte.

## What Was Built

**Task 1 — Landing restyle (commit `40360aa`, `web/src/app/page.tsx`)**
- `h1`: `text-4xl md:text-5xl font-extrabold` → `text-display` (drops `font-extrabold`; inherits Space Grotesk 700 from the globals `h1` rule — NO serif).
- Header "Créer un compte" link-button → `<Link href="/register"><CTAButton variant="accent" size="md"></CTAButton></Link>`; header "Se connecter" gains the canonical focus ring (dropped `font-medium`).
- Both hand-rolled hero `<Link>` "buttons" → `CTAButton` (`accent` "Commencer gratuitement" / `surface` "Se connecter"), `size="lg"`, full-width on mobile (`w-full sm:w-auto` Link + `w-full` button). Primary keeps the sanctioned `shadow-lg shadow-blue-500/20` accent glow.
- Feature cards stay in `SectionCard`; `<h3>` `font-semibold` → `font-bold`; body `text-xs` → `text-sm`.
- Footer version line → `text-caption`. All copy + the `FEATURES` data preserved.

**Task 2 — Auth screens (commit `c01a4c2`, `login/page.tsx` + `register/page.tsx`)**
- Login + register Google/Apple OAuth `<a>` buttons: `font-medium` → `font-normal` (quiet 400 options) + canonical accent focus ring; Google/Apple icon SVGs kept.
- Footer cross-links ("S'inscrire" / "Se connecter"): `font-medium` → `font-normal` + canonical focus ring.
- `Input` fields + the full-width accent `CTAButton` (`size="lg"`, `loading` wired to submit-pending) inherit the 03-01 atom corrections unchanged — no per-field focus/label classes added.
- Register keeps its `confirmPassword` `Input` + the zod `.refine` mismatch surfaced via the Input `error` prop; login keeps "Email ou mot de passe incorrect" on failed submit.
- OAuth callbacks (`google` + `apple`): verified compliant and left untouched — `text-carbon-muted`/`text-carbon-accent` status copy with no `font-medium`/`font-semibold`, transform-based `LoaderCircle animate-spin`, and the `*Content` Suspense subcomponent + token-read/cookie-POST/redirect logic intact.

## Deviations from Plan

None — plan executed as written. The two OAuth callback files were intentionally not edited (they already meet the contract; see decisions) which is consistent with the plan's "verify weights" wording for those files (no `font-medium`/`font-semibold` to change).

## Verification

| Check | Result |
|-------|--------|
| `cd web; npx tsc --noEmit` | clean (0 errors) |
| `cd web; npm run build` | 18/18 routes, 0 ESLint errors |
| grep `font-medium\|font-semibold\|font-extrabold\|font-serif` over `page.tsx` | 0 matches |
| grep `CTAButton` over `page.tsx` | present (3 instances + import + closing tags) |
| Landing `h1` | `text-display` (no `font-extrabold`, no serif) |
| grep `font-medium\|font-semibold\|font-extrabold\|font-serif\|ring-blue-500\|focus:ring-offset-0` over login/register/callbacks | 0 matches |
| OAuth `<a>` buttons + cross-links | `font-normal` + canonical accent focus ring |
| Callback spinner | `LoaderCircle animate-spin` (transform/opacity only) |
| Auth flow preserved (submit, zod `.refine`, OAuth redirect handoff) | unchanged (MD-2) |
| Serif (D-11) | none introduced; titles Space Grotesk 700 |

## Self-Check: PASSED

- web/src/app/page.tsx — FOUND
- web/src/app/login/page.tsx — FOUND
- web/src/app/register/page.tsx — FOUND
- commit 40360aa — FOUND
- commit c01a4c2 — FOUND
