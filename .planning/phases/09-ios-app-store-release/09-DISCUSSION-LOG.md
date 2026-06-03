---
phase: 09-ios-app-store-release
type: discussion-log
date: 2026-06-03
mode: auto (user declined interactive gray-area selection twice)
---

# Phase 9 — Discussion Log

## Process

User invoked `/discuss-phase 9` without flags. The orchestrator wrote a base CONTEXT.md
(D-36..D-40, app identity / EAS env / Info.plist / privacy URL / division of labor). The
agent declined two AskUserQuestion prompts → switched to **auto mode**: extended the existing
CONTEXT.md with D-41..D-45 covering gaps that would block App Review or that the base context
left unspecified.

## Areas covered

### REL-1 — App identity & store metadata (D-36, D-44)
- Bundle id `com.verygoodtrip.app` kept (already set).
- Name `verygoodtrip` / subtitle `Coût réel d'un trajet voiture` / Travel + Navigation / 4+.
- FR-only listing at launch (EN can be added later without resubmission).
- Marketing version `1.0.0`; build number via EAS `autoIncrement`.
- Keywords + promotional text drafted in FR (D-44).

### REL-2 — Visual assets & screenshots (D-42, D-44)
- Icon: `assets/images/icon.png` already 1024×1024 (verified in pre-flight) — Apple masks.
- Splash: editorial-dark light/dark already wired — no change.
- **`ios.supportsTablet: true` → `false`** for v1.0 (avoids mandatory iPad screenshots).
- 5 FR phone screenshots @ 6.7" + 6.5".
- App Preview video skipped.

### REL-3 — Permissions, privacy & ATT (D-38, D-41, App Privacy labels)
- No location/camera/photos/mic permissions added (none used → adding would auto-reject).
- `ITSAppUsesNonExemptEncryption: false` to skip per-submit export-compliance prompt.
- App Privacy labels: Email + User Content linked to identity, App Functionality, **not used
  for tracking**. No advertising SDKs.
- Privacy manifest: rely on Expo SDK 54 module-level manifests; audit `@rnmapbox/maps` /
  `react-native-reanimated` / `expo-secure-store` ship their own `PrivacyInfo.xcprivacy`.
- **D-41 — HARD BLOCKER surfaced**: Sign in with Apple requires in-app account deletion
  (guideline 5.1.1). Backend `DELETE /users/me` does not exist + no Settings UI → REL-04
  sub-slice required BEFORE submission.

### REL-4 — EAS, credentials & release strategy (D-37, D-40, D-43, D-45)
- EAS-managed credentials (interactive `eas credentials` once).
- Production env vars set in EAS (not committed): `EXPO_PUBLIC_API_URL` (real Render),
  `EXPO_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_DOWNLOAD_TOKEN`.
- `eas submit` auth via App Store Connect API key `.p8` (avoids 2FA, works headlessly).
- Release strategy: TestFlight internal smoke on a physical iPhone → promote to App Review.
- 5-wave plan (D-45) with REL-04 + privacy/support pages as Wave 1 blockers.

## Decisions Captured

D-36 identity · D-37 EAS env vars · D-38 Info.plist + no permissions · D-39 /privacy + /support
on Vercel · D-40 agent vs user division of labor · **D-41 account-deletion (App Review
blocker)** · D-42 supportsTablet=false · D-43 ASC API key submission · D-44 listing draft ·
D-45 plan waves.

## User-owned prerequisites (blocking, cannot be automated)

1. Apple Developer Program enrollment ($99/yr) on `louissoudy2@gmail.com` (24–48h approval).
2. Create the app shell on App Store Connect (bundle id `com.verygoodtrip.app`, primary lang FR).
3. Generate App Store Connect API key `.p8`.
4. Send `appleTeamId` + `ascAppId` for `eas.json`.
5. Set EAS production env vars (API URL + Mapbox public + Mapbox download).
6. Run `eas build` + `eas submit` and submit for Review.

## Noted for Later (deferred — out of Phase 9)

- Google Play release — explicit user decision: "iOS maintenant, Google Play plus tard".
- Crash-reporting / analytics SDKs (Sentry, Crashlytics, PostHog) — not in v1.0.
- iPad-optimized layout — revisit when iPad is an actual target.
- Push notifications, deep-link universal links, in-app purchases.
- App Preview video — optional; can add later without a new build.
- EN App Store listing — can be added post-launch without a new build.

## Claude's discretion

User declined two AskUserQuestion prompts. The agent proceeded with auto-mode defaults grounded
in `mobile/app.config.ts`, `mobile/eas.json`, REQUIREMENTS REL-01, and Apple's published
guidelines (Sign in with Apple deletion, Privacy Manifest, screenshot size matrix). All choices
are reversible by the user before Wave 5 (the build/submit run).
