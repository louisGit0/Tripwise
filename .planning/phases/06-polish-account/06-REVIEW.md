---
phase: 06-polish-account
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - backend/src/users/dto/update-profile.dto.ts
  - backend/src/users/users.controller.ts
  - backend/src/users/users.service.ts
  - backend/test/users.e2e-spec.ts
  - web/src/app/app/trips/result/page.tsx
  - web/src/app/app/trips/[id]/page.tsx
  - web/src/app/app/settings/page.tsx
  - mobile/app/(tabs)/dashboard.tsx
  - mobile/app/(tabs)/settings.tsx
  - mobile/src/i18n/translations/fr.ts
  - mobile/src/i18n/translations/en.ts
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: resolved
fixed: [WR-01]
deferred: [IN-01, IN-02, IN-03, IN-04]
note: "0 Critical — endpoint verified IDOR/mass-assignment-safe; MD-2 clean; share total correct. WR-01 (FR comma on shared distance) fixed web+mobile."
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the three Phase 6 refinements (POL-01 badge removal, POL-02 share, POL-03 editable
pseudo) across backend, web, and mobile. The highest-risk surface — the new `PATCH /users/me`
endpoint — is **clean**: it is IDOR-safe, mass-assignment-safe, length-bounded, trimmed, leaks
no `passwordHash`, and is well covered by e2e tests. No security or correctness Critical issues
were found.

Specifically validated against the focus areas:

- **Backend security (PASS):** Target id comes only from `@CurrentUser().id` (controller line 19),
  never from body/param. The DTO exposes only `displayName`; the global `whitelist +
  forbidNonWhitelisted` ValidationPipe rejects `email`/`passwordHash`/`provider` — proven by the
  e2e test "rejette tout champ non autorisé" (400 + email unchanged). `findOneByOrFail` provides
  not-found handling. The returned projection matches `GET /auth/me` and omits `passwordHash`.
- **MD-2 regressions (PASS):** Badge removal on web result, web detail, and mobile dashboard is
  surgical — the toll amount, breakdown DataBar, D-04 hide-when-0, and `tollIsEstimate` data all
  remain. Settings theme/language/logout sections are preserved on both platforms. No render or
  calc/save path was touched.
- **Share correctness (PASS, one nit):** Both platforms share the toll-inclusive total
  (`energy + toll`), matching the displayed hero. Web `AbortError` on share-cancel is swallowed;
  clipboard fallback works with a success toast. Cost figures use FR comma via `Intl`/`formatEur`.
  Only the *distance* token deviates from FR formatting (see WR-01).
- **Pseudo UI (PASS):** Web and mobile PATCH `/users/me`, enforce `maxLength={40}` client-side,
  disable save when empty, toast on success/failure (`common.error` key confirmed present), and
  reflect the server response immediately.

## Warnings

### WR-01: Shared distance breaks FR number formatting (and differs web vs mobile)

**File:** `web/src/app/app/trips/result/page.tsx:266` and `mobile/app/(tabs)/dashboard.tsx:~108`
**Issue:** The phase context names "FR comma" as a share-correctness criterion. The cost figures
correctly use FR formatting (`fmtEur` / `formatEur` → "42,62 €"), but the distance token does not:
- Web: `` `${result.distance.km.toFixed(1)} km` `` → "450.0 km" (decimal **dot**, not comma).
- Mobile: `` `${result.distance.km} km` `` → "450 km" / "450.7 km" (raw number, dot for decimals).

So a single shared message mixes "42,62 €" (FR) with "450.0 km" (non-FR), and the two platforms
produce different distance strings for the same trip. Not a wrong-total bug, but an FR-consistency
defect in user-facing shared text that the phase explicitly called out.
**Fix:** Format the distance with the FR locale on both platforms, e.g.

```ts
const fmtKm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
// web + mobile
`${fmtKm.format(result.distance.km)} km`  // "450 km" / "450,7 km"
```

## Info

### IN-01: Orphaned mobile i18n keys after badge removal

**File:** `mobile/src/i18n/translations/fr.ts` / `en.ts` (keys `dashboard.tollEstimate`,
`dashboard.tollReal`, `dashboard.tollEstimateTooltip`)
**Issue:** These keys were consumed only by the removed `tollBadge`/`Alert` in
`mobile/app/(tabs)/dashboard.tsx`. After POL-01 they are dead translation entries (grep finds no
remaining reference in the dashboard). Dead keys drift over time.
**Fix:** Remove the three unused keys from both `fr.ts` and `en.ts`, or add a comment if they are
intentionally retained for a future use.

### IN-02: Web share is a silent no-op when neither Web Share nor Clipboard API is available

**File:** `web/src/app/app/trips/result/page.tsx:248-267`
**Issue:** On a non-secure context (HTTP) or an old browser, both `navigator.share` and
`navigator.clipboard` may be undefined. In that case `handleShare` does nothing and shows no
toast — the user clicks "Partager" with zero feedback.
**Fix:** Add an `else`/final fallback that surfaces a toast, e.g.
`showToast('error', 'Le partage n'est pas disponible sur cet appareil');` when neither API exists.

### IN-03: Web share emits "— → —" in distance mode (no route)

**File:** `web/src/app/app/trips/result/page.tsx:255-256, 515-524`
**Issue:** The "Partager" button is always rendered, but in `mode === 'distance'`
`session.origin`/`session.destination` are null, so the route line becomes `— → —`. The total is
still correct, but the route header is meaningless.
**Fix:** Either hide/disable the share button when `mode === 'distance'` (consistent with how Save
is gated via `canSave`), or omit the route line when both labels are absent.

### IN-04: Web vs mobile share use different route label granularity

**File:** `web/src/app/app/trips/result/page.tsx:253-254` vs `mobile/app/(tabs)/dashboard.tsx:~103`
**Issue:** Web trims the label to its first segment (`label.split(',')[0]` → "Paris"); mobile uses
the full label (`origin?.label` → "Paris, Île-de-France, France"). Same trip yields a tidy route on
web and a verbose one on mobile.
**Fix:** Align the two — apply the same `split(',')[0]` first-segment trim on mobile for parity.

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning  | 1 |
| Info     | 4 |
| **Total**| **5** |

No blockers. The backend endpoint and badge removals are ship-ready; WR-01 (FR distance
formatting) should be fixed before close since the phase explicitly scoped "FR comma" in the
shared summary.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
