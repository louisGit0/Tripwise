---
phase: 08-onboarding
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - web/src/lib/onboarding.ts
  - web/src/components/OnboardingTour.tsx
  - web/src/components/layouts/AppLayout.tsx
  - web/src/app/app/settings/page.tsx
  - mobile/src/lib/onboarding.ts
  - mobile/src/components/OnboardingTour.tsx
  - mobile/app/(tabs)/_layout.tsx
  - mobile/app/(tabs)/settings.tsx
  - mobile/src/i18n/translations/fr.ts
  - mobile/src/i18n/translations/en.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: resolved
fixed: [WR-01, WR-02, WR-03]
deferred: [IN-01, IN-02, IN-03, IN-04]
fix_commit: 03f0340
note: "0 Critical — seen-flag logic, leak guards, no-reshow, MD-2 all verified. WR-01 (mobile replay flag via idRef) + WR-02/03 (web modal focus-trap/scroll-lock/restore) fixed."
---

# Phase 8: Code Review Report — Onboarding (ONB-01)

**Reviewed:** 2026-06-03
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Additive web + mobile onboarding carousel. The high-severity blocking concerns
from the phase brief all check out: the seen-flag auto-shows ONLY when unset,
finish/skip/close/backdrop/escape all persist it, replay re-opens without
clearing the flag, the key is per-user, the web util is SSR-safe and never
throws, and all four mount/Settings touch points are strictly ADDITIVE (verified
against `04416d2~1`). No auto-reshow regression. No new dependency. i18n FR/EN is
symmetric. No `console.log`.

No Critical findings. Four Warnings worth fixing — the strongest is a mobile
replay edge case where dismiss may fail to persist the flag, plus a couple of
genuine accessibility/keyboard-trap gaps in the web modal. The rest are Info.

## Warnings

### WR-01: Mobile replay can open the tour with a stale/empty `userId`, so finishing it does NOT persist the seen flag

**File:** `mobile/src/components/OnboardingTour.tsx:70-77` (listener) + `:86-89` (`dismiss`)
**Issue:** The `DeviceEventEmitter` listener is registered once in the `[]`
effect and closes over the first-render `userId` (always `null`). It tries to
backfill via `if (!userId && resolvedId) setUserId(resolvedId)`. In the normal
flow `/auth/me` already ran `setUserId(id)`, so the live `userId` is set and
`dismiss` (dep `[userId]`) persists correctly. But if `/auth/me` is still
in-flight or failed when the user taps "Revoir le tutoriel" in Settings, the
replay opens with `userId === null` and `resolvedId === null` — then `dismiss`
calls `markOnboardingSeen` only `if (userId)`, so the flag is never written and
the tour will auto-reshow on next launch. The web component has the same
shape (`web/.../OnboardingTour.tsx:112-115`) but web replay only fires from the
same authed shell after `/auth/me` resolves, so the window is narrower.
**Fix:** Persist using whatever id is available at dismiss time, and resolve the
id independently of the in-flight request. Minimal fix — keep a ref to the last
known id and mark seen from it:
```ts
const idRef = useRef<string | null>(null);
// in /auth/me .then: idRef.current = id; setUserId(id);
// in listener: setStep(0); setOpen(true);  // no need to gate on userId
const dismiss = useCallback(() => {
  if (idRef.current) void markOnboardingSeen(idRef.current);
  setOpen(false);
}, []);
```

### WR-02: Web onboarding modal does not trap focus or restore it — keyboard/AT users can tab into the page behind the backdrop

**File:** `web/src/components/OnboardingTour.tsx:143-249`
**Issue:** The dialog sets `role="dialog" aria-modal="true"` but nothing
constrains Tab focus to the panel, nothing moves focus into the dialog on open,
and focus is not restored to the trigger on close. With `aria-modal` advertised
but no actual focus containment, keyboard and screen-reader users can Tab out to
the still-interactive app shell underneath. (Escape-to-close is handled, which is
good, but it is only half of the modal contract.)
**Fix:** On open, move focus to the panel/close button; loop Tab/Shift+Tab within
the focusable elements; on close, restore focus to the previously focused element.
A small focus-trap effect or the project's existing `Modal` primitive
(`web/src/components/ui/Modal.tsx`) would cover this without a new dependency.

### WR-03: Web modal body does not lock background scroll while open

**File:** `web/src/components/OnboardingTour.tsx:143-155`
**Issue:** The backdrop covers the viewport but `document.body` scrolling is not
disabled while the tour is open. On the auto-show (first authed load on the
dashboard) the page behind the scrim still scrolls under touch/wheel, which reads
as a half-finished overlay and conflicts with the `aria-modal` claim.
**Fix:** In an effect gated on `open`, set `document.body.style.overflow =
'hidden'` and restore the prior value in cleanup (matching whatever `TripModal` /
`Modal` already do, for consistency).

### WR-04: Mobile auto-show race — `setOpen(true)` can fire after the seen flag is read but is not guarded against a concurrent replay/unmount window

**File:** `mobile/src/components/OnboardingTour.tsx:54-64`
**Issue:** The `/auth/me` `.then` is `async` and awaits `hasSeenOnboarding(id)`.
Between the `await` and `setOpen(true)` only `mountedRef.current` is re-checked,
which is correct for unmount. However `step`/`open` are set without considering
that a replay event could have arrived during the await (it would set
`open=true, step=0` too, so benign here) — the real latent risk is that
`hasSeenOnboarding` is awaited every mount of the tabs layout. Because the tour
is mounted in `(tabs)/_layout`, it re-runs `/auth/me` + a SecureStore read on
every remount of the tab group. Functionally fine, but it means an extra network
call and a keychain read on each cold entry into the tab stack.
**Fix:** Acceptable as-is for ONB-01, but consider gating the `/auth/me` fetch
behind the existing `AuthContext` user id (already available app-side) instead of
re-fetching, removing both the redundant request and the stale-closure id problem
in WR-01.

## Info

### IN-01: Dead `TabIcon`/`icons` code retained in the touched tabs layout

**File:** `mobile/app/(tabs)/_layout.tsx:8-18`
**Issue:** `TabIcon` builds an `icons` record and `size`/`color`/`name` params but
unconditionally `return null` — fully dead. It predates this phase but lives in a
file this change edits.
**Fix:** Out of scope for ONB-01; remove in a cleanup pass to avoid unused-var
lint noise.

### IN-02: Web step content is hardcoded FR while mobile uses i18next — intentional but creates two sources of truth

**File:** `web/src/components/OnboardingTour.tsx:34-70` vs `mobile/src/i18n/translations/{fr,en}.ts`
**Issue:** Per CONTEXT (web follows the post-next-intl hardcoded-FR approach) this
is by design, but the seven step strings now exist twice and can drift. Wording
already differs slightly (web s2 mentions "énergie + péage", mobile s2 says only
"le coût total").
**Fix:** Accept for V1; if web i18n returns in V2, source both from one place.

### IN-03: `withBackdropAlpha` assumes a 6-digit hex and silently produces an invalid color otherwise

**File:** `mobile/src/components/OnboardingTour.tsx:166-169`
**Issue:** `${hex}d9` only yields a valid 8-digit RGBA hex when `c.bg` is exactly
`#RRGGBB`. If a theme token were ever `rgb(...)`, a 3-digit hex, or named, the
backdrop color becomes invalid and RN may throw or fall back. Current tokens are
6-digit hex so it works today.
**Fix:** Defensive: validate `^#[0-9a-fA-F]{6}$` before appending, else fall back
to `rgba(0,0,0,0.85)`.

### IN-04: Mobile dots use accessibility-invisible width-only active state; web mirrors this

**File:** `mobile/src/components/OnboardingTour.tsx:125-137`, `web/.../OnboardingTour.tsx:199-212`
**Issue:** Progress is conveyed purely visually (dot width/color), and both dot
rows are `aria-hidden` / unlabeled. The "Étape n / N" eyebrow does carry the
state textually, so this is acceptable, but the dots themselves give AT users
nothing.
**Fix:** None required given the textual step counter; optional `aria-label` on
the dot container if desired.

---

## Severity Summary

- **Critical:** 0 — no auto-reshow regression, seen-flag persists on all dismiss paths, listeners/fetches are cleaned up (web `cancelled` guard + removeEventListener; mobile `mountedRef` + `sub.remove()`), and all MD-2 mounts are strictly additive.
- **Warning:** 4 — WR-01 (mobile replay may skip persisting the flag when id unresolved), WR-02 (no focus trap/restore despite `aria-modal`), WR-03 (no background scroll lock), WR-04 (redundant per-mount `/auth/me`).
- **Info:** 4 — dead `TabIcon`, FR copy duplication risk, fragile hex alpha, visual-only dots.

_Reviewed: 2026-06-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
