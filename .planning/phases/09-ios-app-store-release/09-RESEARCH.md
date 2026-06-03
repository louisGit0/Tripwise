# Phase 9: iOS App Store Release — Research

**Researched:** 2026-06-03
**Domain:** Expo SDK 54 production iOS build · EAS Build + EAS Submit · App Store Connect (TestFlight → review) · Apple privacy manifests · App Store metadata/assets · code-signing credentials
**Confidence:** HIGH on Expo/EAS surface (read the repo's current `app.config.ts` / `eas.json` / `package.json` directly + Expo SDK 54 docs cited inline). MEDIUM on Apple-side specifics (privacy nutrition labels, review timing, ATT applicability) — those depend on Apple's current policy at submission day; the relevant claims are tagged `[CITED]` / `[ASSUMED]` and flagged in the Assumptions Log.

## Summary

Phase 9 ships the existing Expo app — already EAS-buildable and feature-complete after v1.1 Phases 6–8 — to the **iOS App Store only** (Google Play deferred). The work is split into three buckets: (a) **agent-owned config + metadata work** (production `app.config.ts` hardening: `ios.bundleIdentifier` final, `ios.buildNumber`/autoIncrement, `ios.config.usesNonExemptEncryption=false`, `ios.infoPlist` usage strings, privacy manifest, App Store icon 1024 normalization, FR screenshot set, App Store Connect text); (b) **user-owned account work** (Apple Developer Program enrollment $99/yr, Apple ID for App Store Connect, the App Record on App Store Connect → returns `ascAppId` + `appleTeamId` for `eas.json`, an App Store Connect API key `.p8` for `eas submit`, a public privacy policy URL); (c) **EAS run** (`eas build --profile production --platform ios` → `eas submit --profile production --platform ios` → TestFlight → submit-for-review). `@rnmapbox/maps` is already configured for a native build (D-22 / 05-02 — production EAS builds work; Expo Go does not — verified in `app.config.ts:50-55`), and `MAPBOX_DOWNLOAD_TOKEN` is the only EAS Secret that must exist at build time.

Two real things have changed since the project was bootstrapped that the plan must address: **Apple's privacy manifest requirement** (`PrivacyInfo.xcprivacy` — enforced since May 2024 for third-party SDKs using "required-reason APIs", and the App Store rejects submissions missing it for known SDK fingerprints) `[CITED: developer.apple.com/support/third-party-SDK-requirements]`, and **Apple's privacy nutrition labels + privacy policy URL requirement** (every new app needs a public privacy policy URL in App Store Connect, regardless of data collected) `[CITED: developer.apple.com/app-store/app-privacy-details]`. Expo SDK 54 auto-generates a baseline privacy manifest from the plugins it ships `[CITED: docs.expo.dev/guides/apple-privacy]`, but app-level overrides (and any third-party RN modules that aren't Expo-managed) must be declared via `ios.privacyManifests` in `app.config.ts`.

The deepest pitfall is **first-rejection time-loss**: Apple Review is 24-48h `[ASSUMED]` per submission; common avoidable rejections are (1) missing privacy policy URL, (2) missing/wrong usage strings (`NSAppleSignInUsageDescription` if Apple Sign In is shown — verify whether iOS requires it for `expo-apple-authentication`), (3) crash on the reviewer's device because Mapbox download token wasn't set as an EAS Secret, (4) export-compliance question left unanswered → submission stuck "Waiting for Export Compliance" indefinitely, (5) screenshots not matching the actual app, (6) "Sign In with Apple" required when offering Google Sign-In (Apple's Guideline 4.8) — **this app already implements Apple Sign In, so OK** (verified `expo-apple-authentication` in `package.json:26`).

**Primary recommendation:** Treat Phase 9 as **three sequential waves**, each gated by an explicit human-verify checkpoint because the user owns the Apple account: **Wave 1 — Config & assets (agent-owned)**: harden `app.config.ts` (encryption flag, privacy manifest, usage strings if needed), produce final 1024×1024 App Store icon, draft App Store Connect metadata (name, subtitle, FR/EN description, keywords, support URL, privacy policy URL), draft a minimal privacy policy page (host on the existing Vercel `web/` deployment), and prepare a 6.7" iPhone screenshot set; **Wave 2 — Apple account setup (user-owned, checkpointed)**: enroll Apple Developer Program (or confirm enrolled), create the App Record on App Store Connect (returns `ascAppId`), confirm `appleTeamId`, create an App Store Connect API key (`.p8` + key ID + issuer ID), set EAS Secrets (`MAPBOX_DOWNLOAD_TOKEN`, the production `EXPO_PUBLIC_API_URL`, the production `EXPO_PUBLIC_MAPBOX_TOKEN`); **Wave 3 — Build & submit**: `eas build --profile production --platform ios`, then `eas submit --profile production --platform ios` (API-key auth), TestFlight smoke (the user installs on their device, taps through every screen), then "Submit for Review" in App Store Connect. Google Play is explicitly out of scope (deferred).

## Critical Updates (2026-06-03 re-research pass)

Two findings during a re-research pass against current Apple + Apple TN3194 docs that the planner MUST honour over what the rest of this document still says:

1. **Screenshot sizes — OVERRIDE D-44/D-45 and §Don't Hand-Roll row 5 + §Pitfall 3-area:** Apple's 2026 primary iPhone screenshot is now **6.9″ at 1320 × 2868 (iPhone 17 Pro Max class)**, with **6.5″ at 1242 × 2688 (iPhone 11 Pro Max class)** as the only required fallback. The "6.7″ only" claim in Don't Hand-Roll (A3) is the **previous** generation's primary and may now upload but is no longer "the primary". Plan Wave 1/Wave 3 must produce **6.9″ + 6.5″** sets. ([CITED: developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/], confirmed via independent 2026 guides linked under Sources.)

2. **Sign in with Apple account deletion — token revoke is the recommended pattern:** Apple TN3194 (Handling account deletions and revoking tokens for Sign in with Apple) frames `POST https://appleid.apple.com/auth/revoke` (ES256 client_secret JWT signed by the existing `.p8`, with the user's Apple refresh token) as the correct way to handle deletion for SIWA users. Wording is "should", not "must" — some apps pass review without it. Planner must surface this as an **explicit user decision** in the Wave-1 backend slice (D-41): ship `DELETE /users/me` with token revoke (safer, +1 small migration to store the Apple refresh token + small new revoke service) or without (faster, accept a small risk of a rejection round-trip). Recommend "without" by default; flip to "with" if user wants zero-rejection-risk. ([CITED: developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple], [CITED: developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens])

These two override the corresponding statements below where they conflict.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-36 Identity** — Bundle id `com.verygoodtrip.app`, app name `verygoodtrip`, version `1.0.0`, build via EAS `autoIncrement`.
- **D-37 EAS production env** — `EXPO_PUBLIC_API_URL` (Render prod), `EXPO_PUBLIC_MAPBOX_TOKEN` (public, restricted to bundle id), `MAPBOX_DOWNLOAD_TOKEN` (DOWNLOADS:READ secret) set in EAS Dashboard scoped to `production` (never committed); `eas.json` production profile already links via `"environment": "production"`.
- **D-38 Info.plist** — `ITSAppUsesNonExemptEncryption: false`; no location/camera/photo/mic permissions; rely on Expo SDK 54 module-level privacy manifests.
- **D-39 Privacy + Support URLs** — `/privacy` + `/support` pages on the existing Vercel `web/` deployment, editorial-dark, FR.
- **D-40 Division of labor** — Agent prepares config/assets/metadata draft/runbook; user owns Apple Developer Program, EAS env vars, ASC app shell, `eas build`/`eas submit`, screenshots, Apple review.
- **D-41 Account deletion** — `DELETE /users/me` (JWT-guarded, `@CurrentUser`), TypeORM cascades wired, returns 204 + e2e; web Settings danger zone + Modal confirm + BFF logout; mobile Settings danger zone + Alert.alert confirm + signOut. (See Critical Updates #2 for the optional SIWA token revoke add-on.)
- **D-42 No iPad** — `ios.supportsTablet: false` (already correct in `app.config.ts`).
- **D-43 ASC API key (.p8)** — Use App Store Connect API key for `eas submit`, not Apple ID + 2FA.
- **D-44 ASC listing draft (FR-only at launch)** — Travel/Navigation, 4+, keywords + promotional text + 5 phone screenshots (now 6.9″ + 6.5″, see Critical Updates #1), demo reviewer account with seeded data, FR+EN reviewer notes.
- **D-45 Plan waves** — Wave 1 BLOCKING: D-41 slice + privacy/support pages. Wave 2 parallel: config hardening + privacy-manifest audit. Wave 3: 5 FR phone screenshots (6.9″+6.5″). Wave 4 USER-OWNED BLOCKING: Apple Developer + ASC app shell + `.p8` + `appleTeamId`/`ascAppId` + EAS env vars. Wave 5: `eas build` → TestFlight smoke on physical iPhone → `eas submit` → fill listing → Submit for Review.

### Claude's Discretion
CONTEXT was generated in auto-mode after the user declined two clarification prompts. All choices are reversible by the user before Wave 5. Agent owns: exact `/privacy` + `/support` page copy (FR, RGPD-aware, editorial-dark), exact `app.config.ts` and `eas.json` patches (kept under user review before Wave 4), account-deletion UX wording, reviewer notes text, backend e2e scaffold for `DELETE /users/me`, runbook step ordering.

### Deferred Ideas (OUT OF SCOPE)
- Google Play release ("iOS maintenant, Google Play plus tard")
- Crash-reporting / analytics SDKs (Sentry, Crashlytics, PostHog)
- iPad-optimized layout
- Push notifications, deep-link universal links, in-app purchases
- App Preview video (optional; can add later without a new build)
- EN App Store listing (can be added post-launch without a new build)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-01 | The app is published to the iOS App Store (EAS prod build + App Store Connect submission). Apple Developer account/credentials/review owned by the user. Google Play deferred. | Standard Stack: `eas-cli` + ASC `.p8`. Architecture: 5-wave plan (D-45) with the account-deletion slice (D-41) + `/privacy` + `/support` as Wave-1 blockers. Pitfalls catalogue covers every common reason Apple rejects v1.0 submissions (icon alpha, privacy manifest gap, export compliance, Mapbox token misconfig, ATT mis-declaration, name collision, demo-account onboarding tour). |

> The REL-01 success criterion translates to **five gates**, three of which are human-driven (Wave 4 setup, Wave 5 build, Wave 5 submit). Agent's deliverable is "everything ready for Wave 4" + runbook.
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bundle identifier, version/build, encryption flag | Mobile App Config (`app.config.ts`) | EAS Build (autoIncrement) | These live in the Expo config and are picked up by EAS prebuild; `autoIncrement: true` already set in `eas.json:18`. |
| iOS Info.plist usage strings | Mobile App Config (`app.config.ts` → `ios.infoPlist`) | — | Expo CNG (continuous native generation) writes Info.plist from `app.config.ts` at build time; never hand-edit `ios/`. |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | Mobile App Config (`ios.privacyManifests`) | Expo SDK 54 baseline | Expo auto-generates a baseline; app-level + any non-Expo RN modules need explicit declarations. |
| Code-signing credentials (distribution cert + provisioning profile) | EAS Build (managed credentials) | Apple Developer Portal (source) | EAS-managed credentials is the standard path; EAS asks Apple for them on first build. |
| App Store icon + screenshots + listing text | Apple — App Store Connect (UI/API upload) | Agent prepares the assets | Asset content is agent-owned; upload happens in App Store Connect (user) or via `expo-apple-app-icon-tool` (out of scope). |
| Privacy policy hosting | Web — existing Vercel deployment (new static route under `web/`) | — | Apple requires a public URL; reuse `web/` (already deployed to Vercel) rather than spinning up new hosting. |
| Production build artifact (`.ipa`) | EAS Build (cloud) | — | Cloud-only path — no local Xcode needed (`@rnmapbox/maps` already wires the native build via the Expo config plugin). |
| Submission to App Store Connect | EAS Submit | App Store Connect API key (`.p8`) | `eas submit` with an ASC API key is more robust than app-specific passwords (works with 2FA, automatable later). |
| TestFlight smoke | User device | — | The user holds the Apple ID; agent cannot install. |

## Standard Stack

### Core (already in the project — no new runtime/dev dependencies needed)
| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `expo` | `~54.0.33` (verified `mobile/package.json:25`) | App framework, CNG (continuous native generation), config plugins | Already in use |
| `eas-cli` | `>= 16.0.0` (verified `mobile/eas.json:3`) | Cloud build + submission | Already pinned |
| `@rnmapbox/maps` | `^10.3.1` (verified `mobile/package.json:23`) | Map module — its Expo config plugin handles the native build wiring | Already wired with `MAPBOX_DOWNLOAD_TOKEN` indirection |
| `expo-apple-authentication` | `~8.0.8` (verified `mobile/package.json:26`) | Apple Sign In — required because Google Sign-In is offered (Apple Guideline 4.8) | Already present + `usesAppleSignIn: true` in config |
| `expo-secure-store` / `expo-localization` / `expo-web-browser` / `expo-splash-screen` | per `package.json` | All wired in `app.config.ts:32-46` plugins | Already wired |

### Supporting (verify before relying on)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Apple Developer Program | $99/yr (USD) `[ASSUMED — current pricing]` — required to publish | One-time enrollment, owned by the user (louissoudy2@gmail.com per `mobile/eas.json:24`) |
| App Store Connect | Web console — creates the App Record, holds metadata + screenshots + review status | All listing data + screenshots + privacy nutrition + submission |
| App Store Connect API Key (`.p8`) | Programmatic auth for `eas submit` — alternative to an app-specific password | RECOMMENDED — works under 2FA, doesn't expire on Apple-ID password change `[CITED: docs.expo.dev/submit/ios]` |
| Privacy policy URL | Required field in App Store Connect — public URL `[CITED: developer.apple.com/app-store/app-privacy-details]` | Host a `/legal/privacy` route on the existing Vercel `web/` deployment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EAS-managed credentials | "Manual credentials" (distribution cert + profile uploaded by hand) | Managed is simpler + survives expiry; manual is only justified if the user already has a working cert they want to reuse. **Choose managed** unless the user objects. |
| App Store Connect API Key for `eas submit` | App-specific password (Apple ID + ASP) | ASP requires re-issuing on Apple-ID password change; API key is stable + automatable. **Choose API key.** |
| 6.7" + 6.5" + 5.5" + iPad screenshot sets | 6.7" only (iPhone 15 Pro Max class) | Apple now auto-derives smaller iPhone screens from the 6.7" set (since 2023) `[ASSUMED — verify in App Store Connect submission flow]`. iPad is optional (no iPad-specific UI). **Ship 6.7" only.** |
| Submit via `eas submit` CLI | Submit via App Store Connect web UI manual upload of the `.ipa` | `eas submit` is one command and integrates with the build artifact ID. **Use `eas submit`.** |

**Installation:** No new dependencies. `eas-cli` is invoked via `npx eas-cli` (already pinned in `eas.json`); confirm the latest stable matches `>= 16.0.0` before the production run with `npx eas-cli --version`.

## Package Legitimacy Audit

> Phase 9 installs **zero external packages**. All tooling is already declared (`eas-cli` via `eas.json`, all RN/Expo deps in `mobile/package.json`).

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none) | — | N/A — release-engineering phase, no `npm install` |

**Packages removed due to slopcheck [SLOP] verdict:** none — none considered.
**Packages flagged as suspicious [SUS]:** none — none considered.

If the planner later decides to add `expo-apple-app-icon-tool` or `eas-secret-cli` as conveniences, slopcheck must be run at plan-time per protocol — neither is needed for the success-criteria of REL-01.

## Architecture Patterns

### Submission Flow Diagram

```
                                     ┌─────────────────────────┐
                                     │  Apple Developer Account │ (user-owned, $99/yr)
                                     │  louissoudy2@gmail.com   │
                                     └────────────┬────────────┘
                                                  │ enroll, generate
                                                  ▼
                       ┌──────────────────────────────────────────────┐
                       │  App Store Connect (web console)              │
                       │  • Create App Record → ascAppId, appleTeamId  │
                       │  • Generate ASC API key → .p8 + keyId + iss   │
                       │  • Fill metadata (name, subtitle, desc, kw,   │
                       │    support URL, privacy policy URL)           │
                       │  • Upload screenshots                          │
                       │  • Fill privacy nutrition labels              │
                       └──────────────────────────────────────────────┘
                                                  │
                                                  │ values fed into:
                                                  ▼
   ┌──────────────────────┐         ┌─────────────────────────────────┐
   │ mobile/app.config.ts │         │ mobile/eas.json                  │
   │ • bundleId           │         │ • submit.production.ios.appleId  │
   │ • version            │         │ • ascAppId  ← from App Record    │
   │ • build (auto)       │         │ • appleTeamId  ← from Membership │
   │ • usesNonExemptEncr  │         │ • ascApiKeyPath  ← .p8 path     │
   │ • privacyManifests   │         └─────────────────────────────────┘
   │ • infoPlist usage    │                       │
   └──────────────────────┘                       │
              │                                   │
              │ EAS Secrets (set via eas secret:create):
              │   • MAPBOX_DOWNLOAD_TOKEN (build-time, NOT EXPO_PUBLIC_)
              │   • EXPO_PUBLIC_API_URL (prod backend on Render)
              │   • EXPO_PUBLIC_MAPBOX_TOKEN (runtime public token)
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ npx eas-cli build --profile production --platform ios            │
   │  → cloud build → signed .ipa artifact                            │
   └─────────────────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ npx eas-cli submit --profile production --platform ios           │
   │  (uses ASC API key, references the build by id)                  │
   │  → uploads to App Store Connect → appears in TestFlight          │
   └─────────────────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ TestFlight (Internal testing — user only)                        │
   │  • user installs on physical iPhone                              │
   │  • golden-path smoke: signup → calc trip → save → favorites →    │
   │    pseudo edit → onboarding replay → photos → tolls breakdown    │
   └─────────────────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ App Store Connect → "Submit for Review"                          │
   │  • answer export compliance (= false, see Pitfall 4)             │
   │  • answer ad tracking (= no IDFA used)                           │
   │  • Apple review (24–48h typical)                                 │
   │  • → Ready for Sale                                              │
   └─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (additions)

```
mobile/
├── app.config.ts        # MODIFIED — encryption flag, privacy manifest, usage strings, buildNumber
└── eas.json             # MODIFIED — submit.production.ios filled with ascAppId + appleTeamId + ascApiKeyPath

web/
└── src/app/legal/
    └── privacy/
        └── page.tsx     # NEW — static FR privacy policy at https://verygoodtrip.vercel.app/legal/privacy

.planning/phases/09-ios-app-store-release/
└── assets/              # NEW — submission-ready PNG drafts (1024 icon, 6.7" screenshots)
                         # (kept in .planning/, NOT committed to mobile/assets/ — these are submission assets,
                         #  not app-bundled assets)
```

### Pattern 1: Production `app.config.ts` hardening (additive — preserve everything Phase 5 wired)

```typescript
// Source: docs.expo.dev/versions/v54.0.0/config/app/  +  current mobile/app.config.ts
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'verygoodtrip',
  slug: 'verygoodtrip',
  version: '1.0.0',
  scheme: 'verygoodtrip',
  orientation: 'portrait',
  icon: './assets/images/icon.png',         // MUST be 1024×1024, opaque, no alpha — see Pitfall 1
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.verygoodtrip.app',
    usesAppleSignIn: true,
    // NEW — answer export-compliance question once, in code (Pitfall 4)
    config: {
      usesNonExemptEncryption: false,       // we use HTTPS/TLS only — exempt
    },
    // NEW — Info.plist usage strings declared once here; EAS writes Info.plist on build
    infoPlist: {
      // The app does not currently use Camera/Photos/Location/Mic/Contacts.
      // If location is added later, add NSLocationWhenInUseUsageDescription here.
      // ITSAppUsesNonExemptEncryption is redundant if ios.config.usesNonExemptEncryption is set,
      // but Apple sometimes still asks — include both for safety.
      ITSAppUsesNonExemptEncryption: false,
    },
    // NEW — privacy manifest (PrivacyInfo.xcprivacy) — declarative; Expo writes the file
    // Source: docs.expo.dev/guides/apple-privacy
    privacyManifests: {
      NSPrivacyTracking: false,             // app does NOT track across other apps/sites
      NSPrivacyTrackingDomains: [],         // empty when NSPrivacyTracking=false
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName', // display_name / pseudo
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent', // trips, favorites, vehicles
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
      // Required-reason API declarations — Expo SDK 54 includes a baseline; we add ours if needed.
      // [ASSUMED] Expo SDK 54's bundled manifest already covers UserDefaults (used by expo-secure-store /
      // AsyncStorage internals) and FileTimestamp. Verify the merged PrivacyInfo.xcprivacy in the build artifact.
      NSPrivacyAccessedAPITypes: [],
    },
  },
  // android / web / plugins / experiments / extra unchanged — preserved verbatim
  plugins: [/* … unchanged … */],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: { /* … unchanged … */ },
};

export default config;
```

### Pattern 2: `eas.json` `submit.production.ios` (fill the empty slots)

```json
// Source: docs.expo.dev/submit/ios — fill the 3 currently-empty fields + add API key path
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "louissoudy2@gmail.com",
        "ascAppId": "<filled after the App Record is created in App Store Connect>",
        "appleTeamId": "<filled from developer.apple.com → Membership>",
        "ascApiKeyPath": "./AuthKey_<KEY_ID>.p8",
        "ascApiKeyId": "<KEY_ID>",
        "ascApiIssuerId": "<ISSUER_ID>"
      }
    }
  }
}
```

The `.p8` file MUST NOT be committed. Add `mobile/AuthKey_*.p8` to `.gitignore` and store the file in `mobile/` only on the user's machine, OR upload it once via `eas credentials` and remove the local copy.

### Pattern 3: Privacy policy hosted on the existing Vercel deployment

```tsx
// web/src/app/legal/privacy/page.tsx — NEW static FR page, no auth required, indexable.
// Apple requires a public URL; the App Store Connect privacy field accepts any HTTPS URL.
export const metadata = {
  title: 'Politique de confidentialité — verygoodtrip',
  description: 'Politique de confidentialité de l\'application verygoodtrip.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-carbon-ink">
      <h1 className="font-display text-display font-bold">Politique de confidentialité</h1>
      {/* …short, plain-language sections: Data collected (email, pseudo, vehicles, trips, favoris) ·
          How it's used (provide the service) · Storage (Render/Supabase, EU) · No tracking · No ads ·
          Rights (delete account by contacting support) · Contact (support email) · Last updated date… */}
    </main>
  );
}
```

### Anti-Patterns to Avoid

- **Hand-editing `mobile/ios/` after `expo prebuild`.** Expo regenerates the native folder on every build; any manual edit is silently lost. Always change `app.config.ts`.
- **Committing the `.p8` ASC API key.** It's a long-lived credential. `.gitignore` it; rotate if leaked.
- **Hard-coding `MAPBOX_DOWNLOAD_TOKEN` into `app.config.ts`.** It's a `DOWNLOADS:READ` secret token (different from the public runtime token). Already correct in the repo (`process.env.MAPBOX_DOWNLOAD_TOKEN` at `app.config.ts:53`). Must be set as an EAS Secret, not committed.
- **Submitting without TestFlight smoke first.** Apple Review will install the same binary; if it crashes on launch (most often: missing Mapbox token at build time → blank map, or wrong `EXPO_PUBLIC_API_URL` → all calls fail), the review fails, costing 24-48h.
- **Bumping `version` (marketing) without bumping `build` (CFBundleVersion).** App Store Connect requires `build` strictly increasing for the same `version`. `autoIncrement: true` in `eas.json:18` already handles this — DO NOT also manually edit `ios.buildNumber` in `app.config.ts` (causes drift).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code-signing pipeline | Manual cert generation + provisioning profile management + Xcode signing | EAS-managed credentials | EAS handles cert renewal, multi-team, and the dance with the Apple Developer Portal API. |
| Native iOS build (Xcode) | A local macOS + Xcode build | `eas build --platform ios` (cloud) | The user doesn't need a Mac. EAS builds on its Mac fleet. |
| Privacy manifest file | Hand-writing `PrivacyInfo.xcprivacy` XML | `ios.privacyManifests` in `app.config.ts` | Expo CNG writes the file from the declarative config. |
| App-specific password rotation | Tracking when the Apple-ID password expires and re-issuing ASPs | App Store Connect API key (`.p8`) | Stable, doesn't expire on Apple-ID password change. |
| Screenshot generation across device sizes | Generating 6.7" + 6.5" + 5.5" + iPad screenshots manually | Ship 6.7" only — App Store Connect derives the smaller sizes `[ASSUMED — verify at upload]` | Avoids 4× the asset work. |
| Privacy policy hosting | Spinning up a new static-site host | A new route under the existing Vercel `web/` deployment | One deployment to maintain. |

**Key insight:** This phase is mostly **fill in blanks + answer questions correctly**. The technical heavy-lifting (Mapbox native build, OAuth flows, fonts, design tokens) was all done in Phase 5. The traps are administrative — wrong/missing values block review.

## Common Pitfalls

### Pitfall 1: App Store icon has alpha / is not 1024×1024
**What goes wrong:** Submission rejected immediately (uploader-side, before review) because the icon contains transparency or is the wrong size.
**Why it happens:** The Expo `./assets/images/icon.png` is used for both the home-screen app icon (where transparency is harmless) AND must be derivable into the App Store 1024 icon. If the source has any alpha, App Store Connect rejects the upload.
**How to avoid:** Verify `mobile/assets/images/icon.png` is exactly 1024×1024 with NO alpha channel (`file mobile/assets/images/icon.png` shows "8-bit/color RGB" and not "RGBA"). If it has alpha, flatten it on an opaque background. Expo SDK 54 + `eas build` ships the icon to the App Store automatically `[CITED: docs.expo.dev/develop/user-interface/app-icons]`.
**Warning signs:** `eas submit` returns "Invalid icon" or App Store Connect shows a red banner on the build page.

### Pitfall 2: Privacy manifest missing → review rejected for known-fingerprint SDKs
**What goes wrong:** Apple's automated check at upload time scans for known third-party SDKs (Firebase, Mapbox, etc.) and requires a `PrivacyInfo.xcprivacy` declaring their data access reasons.
**Why it happens:** Apple enforced this for new submissions since **May 2024** `[CITED: developer.apple.com/support/third-party-SDK-requirements]`. Bundles missing privacy manifests for fingerprinted SDKs are blocked or rejected.
**How to avoid:** Expo SDK 54 ships baseline manifests for its own modules `[CITED: docs.expo.dev/guides/apple-privacy]`. For `@rnmapbox/maps` — verify the package ships one; if not, declare its API usage in `ios.privacyManifests.NSPrivacyAccessedAPITypes`. After the first EAS build, extract `PrivacyInfo.xcprivacy` from the .ipa and confirm all SDK fingerprints are declared.
**Warning signs:** App Store Connect "ITMS-XXX: Missing privacy manifest for SDK …" email after upload.

### Pitfall 3: App Tracking Transparency (ATT) prompt missing OR present unnecessarily
**What goes wrong:** EITHER (a) the app uses IDFA / cross-app tracking but doesn't show the ATT prompt → review rejection (Guideline 5.1.2), OR (b) the app shows the ATT prompt but doesn't actually track → review rejection ("misleading").
**Why it happens:** ATT applies when the app accesses the IDFA or correlates user behavior across apps/sites it doesn't own.
**How to avoid:** This app does NOT use IDFA, no analytics SDKs, no third-party trackers (verified: no Firebase Analytics / Amplitude / Mixpanel in `mobile/package.json`). → **No ATT prompt needed**; the privacy manifest above sets `NSPrivacyTracking: false`. In App Store Connect privacy nutrition: select "Data Not Used to Track You" + "Data Linked to You" for the listed types.
**Warning signs:** Apple Review note mentioning Guideline 5.1.2 (privacy).

### Pitfall 4: Export Compliance question loops the submission
**What goes wrong:** Each submission shows "Waiting for Export Compliance" forever, blocking review.
**Why it happens:** Apple requires an answer on whether the app uses non-exempt encryption beyond standard HTTPS/TLS. If unanswered, the submission stalls.
**How to avoid:** Set `ios.config.usesNonExemptEncryption = false` in `app.config.ts` (shown in Pattern 1). This writes `ITSAppUsesNonExemptEncryption=false` to Info.plist and pre-answers the question for every future build `[CITED: docs.expo.dev/versions/v54.0.0/config/app/#config-2]`. The app uses only HTTPS + JWT — exempt.
**Warning signs:** App Store Connect shows "Missing Compliance" yellow banner on the build.

### Pitfall 5: `eas submit` works once, then fails on Apple-ID password change
**What goes wrong:** Subsequent submissions fail with "Invalid Apple ID credentials".
**Why it happens:** Using an Apple ID + app-specific password (ASP) — ASPs are invalidated on Apple-ID password change.
**How to avoid:** Use an **App Store Connect API key** (`.p8`) — generated once in App Store Connect → Users and Access → Keys → "App Store Connect API". Reference via `ascApiKeyPath`/`ascApiKeyId`/`ascApiIssuerId` in `eas.json` (Pattern 2). Stable; doesn't expire on password change.
**Warning signs:** `eas submit` error referencing "Apple ID" / "two-factor" / "invalid credentials".

### Pitfall 6: Mapbox map renders blank in production despite working in dev
**What goes wrong:** The reviewer launches the app, taps "Calculer", sees a blank map → rejection.
**Why it happens:** `MAPBOX_DOWNLOAD_TOKEN` is read at build time (`app.config.ts:53`). If the EAS Secret isn't set when `eas build --profile production` runs, the native iOS build ships without a valid Mapbox SDK download token, and the runtime map fails to initialise. Separately, `EXPO_PUBLIC_MAPBOX_TOKEN` (read at runtime via `extra.mapboxToken`) must also be set, or the public-token-required tile requests 401.
**How to avoid:** Before the production build, verify with `npx eas-cli secret:list` that BOTH tokens exist on the `production` profile. Build, install via TestFlight, open the dashboard, confirm the map shows tiles.
**Warning signs:** Map area renders the editorial-dark `surface2` placeholder forever in TestFlight.

### Pitfall 7: First-login auto-show of the onboarding tour fires for the reviewer
**What goes wrong:** Apple's reviewer logs in with the demo credentials provided in App Store Connect → the v1.1 onboarding tour (D-33/D-34) auto-shows → reviewer dismisses, reviews, BUT some flows still feel like a "tutorial app".
**Why it happens:** The onboarding tour is per-user (keyed by user ID); a fresh reviewer account triggers it once.
**How to avoid:** Provide a **dedicated demo account** in the App Store Connect "App Review Information" section with credentials the reviewer logs in with — once. The onboarding fires once per account/device, then is permanently dismissable via `expo-secure-store` flag (D-34). Document the dismiss path in the Review Notes field: "Press 'Passer' on the welcome carousel to dismiss; everything below is the actual app."
**Warning signs:** Apple Review note referring to "tutorial" or asking about "in-app tutorials".

### Pitfall 8: App name collision in App Store Connect
**What goes wrong:** `name: 'verygoodtrip'` is already taken by another app on the App Store; the App Record can't be created.
**Why it happens:** App Store names are globally unique within a region.
**How to avoid:** Before the App Record is created, search `appstoreconnect.apple.com` for "verygoodtrip"; if taken, choose a variant (e.g. "verygoodtrip - Calcul de trajet"). The bundle identifier `com.verygoodtrip.app` is per-developer-account unique → less likely to collide.
**Warning signs:** App Store Connect: "The App Name you entered is already being used."

## Runtime State Inventory

> Not applicable — Phase 9 is a release-engineering phase with no string renames, refactors, or schema migrations. No runtime state to inventory.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `npx eas-cli` | Build + submit | yes (npm registry) | `>= 16.0.0` (verified `eas.json:3`) | — |
| Apple Developer Program enrollment | Submission | **unknown — checkpoint** | — | None — REL-01 cannot ship without it |
| Apple ID with 2FA enabled | App Store Connect login | yes (`louissoudy2@gmail.com`, verified `eas.json:24`) | — | — |
| `ascAppId` (numeric) | `eas submit` | **no — produced by creating the App Record (Wave 2)** | — | — |
| `appleTeamId` | `eas submit` | **no — read from developer.apple.com → Membership** | — | — |
| App Store Connect API key (`.p8` + key id + issuer id) | `eas submit` | **no — created in Wave 2** | — | — |
| EAS Secret `MAPBOX_DOWNLOAD_TOKEN` | Native iOS build (Mapbox SDK download) | **unknown — verify with `npx eas-cli secret:list`** | — | None — map breaks without it |
| EAS Secret `EXPO_PUBLIC_API_URL` (production backend URL on Render) | Runtime | **unknown — verify** | — | None — all API calls fail |
| EAS Secret `EXPO_PUBLIC_MAPBOX_TOKEN` (public runtime token, domain-restricted) | Runtime tile loads | **unknown — verify** | — | None — map tiles 401 |
| Privacy policy URL (public) | App Store Connect | **no — Wave 1 creates `web/src/app/legal/privacy/page.tsx`** | — | None — required field |
| App Store icon 1024×1024 no-alpha | App Store Connect | **verify — `mobile/assets/images/icon.png`** | — | Regenerate if alpha present |
| FR 6.7" iPhone screenshots (5 minimum) | App Store Connect | **no — Wave 1 produces them from the TestFlight build** | — | None — required asset |
| macOS / Xcode locally | None — EAS Cloud builds | **n/a — not needed** | — | — |
| Physical iPhone for TestFlight smoke | Smoke pre-submit | **assumed — user has one** | — | iOS Simulator on a Mac (less faithful) |

**Missing dependencies with no fallback:**
- Apple Developer Program enrollment (user-owned; blocking).
- `ascAppId`, `appleTeamId`, ASC API key (produced once Apple account is set up).
- The three EAS Secrets (if not yet set).

**Missing dependencies with fallback:** none — every blocker above must be resolved before Wave 3.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None for runtime tests (no test runner in `mobile/` — documented CLAUDE.md "TDD gate gap"). Verification is `tsc --noEmit` + manual TestFlight smoke. |
| Config file | `mobile/tsconfig.json` |
| Quick run command | `cd mobile && npx tsc --noEmit` |
| Full suite command | `cd mobile && npx tsc --noEmit && npx eas-cli build --profile preview --platform ios` (preview = simulator-only build, fast sanity) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REL-01 | `app.config.ts` declares production iOS config + privacy manifest + encryption flag | static check (grep) | `grep -E 'usesNonExemptEncryption\|privacyManifests\|bundleIdentifier' mobile/app.config.ts` | ✅ (after Wave 1 edit) |
| REL-01 | `eas.json` `submit.production.ios` has non-empty `ascAppId` + `appleTeamId` + `ascApiKey*` | static check | `node -e "const j=require('./mobile/eas.json'); const i=j.submit.production.ios; if(!i.ascAppId\|\|!i.appleTeamId\|\|!i.ascApiKeyPath) process.exit(1)"` | ✅ (after Wave 2 fill) |
| REL-01 | Mobile tsc is GREEN | unit | `cd mobile && npx tsc --noEmit` | ✅ |
| REL-01 | Privacy policy page builds + serves | smoke | `cd web && npx tsc --noEmit && npm run build` then `curl -fsSL https://verygoodtrip.vercel.app/legal/privacy` | ✅ (after Wave 1 web page) |
| REL-01 | EAS production iOS build succeeds | manual (cloud build) | `cd mobile && npx eas-cli build --profile production --platform ios --non-interactive` | n/a — EAS run |
| REL-01 | `eas submit` succeeds → TestFlight has the build | manual | `cd mobile && npx eas-cli submit --profile production --platform ios --latest` | n/a — EAS run |
| REL-01 | TestFlight smoke (golden path) | manual | (user-driven on physical iPhone) | n/a — human gate |
| REL-01 | App is "Submitted for Review" then "Ready for Sale" | manual | App Store Connect web UI | n/a — Apple gate |

### Sampling Rate
- **Per task commit:** `cd mobile && npx tsc --noEmit`
- **Per wave merge:** the static grep + JSON shape checks above; a `preview` EAS build before the `production` build catches Mapbox/token issues without burning App Store Connect bandwidth.

### Wave 0 Gaps
- [ ] None — `mobile/tsconfig.json` exists, `tsc` is already the project's verification gate, and EAS is already wired. No new test infrastructure required.

*(No test runner exists in `mobile/` by project convention; documented in CLAUDE.md "No test framework detected in web or mobile".)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Apple Sign In (`expo-apple-authentication` ~8.0.8, verified `mobile/package.json:26`) + email/password + Google OAuth; tokens persisted via `expo-secure-store` (encrypted Keychain). No change in this phase. |
| V3 Session Management | yes | JWT bearer tokens, 7-day expiry, server-side issuance; `expo-secure-store` for client persistence. No change. |
| V4 Access Control | yes | All authenticated endpoints behind `@UseGuards(JwtAuthGuard)` on the NestJS backend. No change. |
| V5 Input Validation | yes | class-validator DTOs server-side; zod schemas client-side. No change. |
| V6 Cryptography | yes | TLS 1.2+ (Render + Vercel HTTPS); JWT signed HS256 with `JWT_SECRET` (server env). `usesNonExemptEncryption=false` is correct (we don't use non-exempt crypto). |
| V14 Configuration | yes | EAS Secrets (`MAPBOX_DOWNLOAD_TOKEN`, `EXPO_PUBLIC_*`); `.gitignore`'d `.env`; `.p8` ASC API key must be gitignored. NEW in this phase: add `mobile/AuthKey_*.p8` to `.gitignore`. |

### Known Threat Patterns for iOS release

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Leaked ASC API key (`.p8`) | Spoofing | `.gitignore` the `.p8`; upload to EAS Credentials store + remove local copy; rotate immediately if leaked (App Store Connect → revoke key). |
| Leaked Mapbox download token | Information Disclosure | Stored as an EAS Secret (build-time, not bundled into the app). Rotate via Mapbox dashboard if leaked. |
| Public Mapbox token misuse | Information Disclosure / Spoofing | `EXPO_PUBLIC_MAPBOX_TOKEN` IS shipped in the .ipa — that is expected. Mitigation: restrict to the production bundle identifier `com.verygoodtrip.app` in the Mapbox dashboard (URL/app-ID restriction). |
| App impersonation / "verygoodtrip"-named copycat in App Store | Spoofing | Bundle ID `com.verygoodtrip.app` is unique to this Apple Developer account; an App Store name reservation is implicit when the App Record is created. |
| Reviewer credentials leaked via Review Notes | Information Disclosure | Use a dedicated low-privilege demo account (created server-side, no real PII); enter credentials only in App Store Connect → App Review Information; rotate after release. |
| Privacy nutrition inaccuracy → consumer complaint → app removal | Repudiation | Privacy nutrition labels must match the privacy policy. Both must list: email, name (display_name), user ID, "other user content" (trips, vehicles, favorites). NO tracking. |

## Code Examples

Already shown above in **Architecture Patterns** (`app.config.ts` hardening, `eas.json` submit block, `web/src/app/legal/privacy/page.tsx`). No additional snippets needed — Phase 9 is config + assets, not new feature code.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App-specific password for `eas submit` | App Store Connect API key (`.p8`) | Stable since ~2019, but became the EAS-recommended default in EAS-CLI 5+ `[ASSUMED]` | More robust under 2FA + Apple-ID password rotation |
| Hand-written `PrivacyInfo.xcprivacy` per pod | Declarative `ios.privacyManifests` in `app.config.ts` (Expo SDK 51+) | Expo SDK 51 (mid-2024) `[CITED: docs.expo.dev/guides/apple-privacy]` | One source of truth in TS config |
| Multi-size screenshot sets (5.5"/6.5"/6.7"/iPad) | 6.7" only, App Store Connect derives smaller iPhone sizes | Apple ~2023 `[ASSUMED — verify at upload]` | 1× the asset work for iPhone-only apps |
| Manual `ios/` folder + Xcode signing | Expo CNG + EAS-managed credentials | Default since EAS Build GA (2022) | No Mac needed locally |
| Apple Sign In optional | **REQUIRED** if any third-party login is offered (Guideline 4.8) | Active since 2019; aggressively enforced since 2020 | This app is already compliant — `expo-apple-authentication` is wired + `usesAppleSignIn: true` |

**Deprecated/outdated:**
- App-specific passwords: still work but discouraged for `eas submit` — use API key.
- TestFlight external test groups: not needed for first submission — Apple's "Internal Testing" (developer account members) is sufficient for the user's own smoke.
- Expo "Classic Build" / `expo build:ios`: removed; EAS Build is the only path on Expo SDK 50+.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Apple Developer Program is $99/yr USD | Standard Stack | Low — pricing may have changed; user will see the actual price at enrollment. |
| A2 | Apple Review turnaround is 24-48h | Summary, Pitfalls | Medium — can be longer (3-5 days) on holidays/policy-heavy reviews. Plan doesn't depend on it; just sets expectation. |
| A3 | App Store Connect derives 6.5"/5.5"/6.1" screenshots from a 6.7" set | Don't Hand-Roll | Medium — verify at upload; if false, plan must add the missing sizes (cost: ~30min of regeneration). |
| A4 | Expo SDK 54's bundled `PrivacyInfo.xcprivacy` covers `expo-secure-store` and core RN required-reason APIs | Pattern 1 | Low-Medium — verify by extracting the manifest from the first .ipa; add overrides in `ios.privacyManifests.NSPrivacyAccessedAPITypes` if any SDK is fingerprinted but undeclared. |
| A5 | `@rnmapbox/maps` v10.3.1 ships its own privacy manifest entry | Pattern 1, Pitfall 2 | Medium — if it doesn't, add `Mapbox` declarations explicitly. Verify against the package's `ios/` folder in `node_modules/@rnmapbox/maps`. |
| A6 | EAS-CLI `>= 16.0.0` is current and supports the ASC API key flow in `submit.production.ios.ascApiKey*` | Pattern 2 | Low — `eas-cli` releases frequently; confirm with `npx eas-cli --version` before the production run. |
| A7 | Google Sign-In + Apple Sign-In satisfies Apple Guideline 4.8 (Apple Sign-In offered alongside third-party SSO) | Pitfall summary | Low — verified by spec text; `expo-apple-authentication` is wired in the app. |
| A8 | `mobile/assets/images/icon.png` is 1024×1024 and has no alpha | Pitfall 1 | Medium — UNVERIFIED in this session; check before submission. |
| A9 | The app does NOT use IDFA / cross-app tracking / analytics SDKs | Pitfall 3, Security | Low — grep of `package.json` shows no Firebase/Amplitude/Mixpanel/Segment; verified directly. |
| A10 | The user has a physical iPhone for TestFlight smoke | Validation | Low-Medium — if not, iOS Simulator on a borrowed Mac is acceptable but less faithful. |
| A11 | The existing Vercel `web/` deployment can serve `/legal/privacy` without auth | Pattern 3 | Low — Next.js App Router: any folder under `web/src/app/` without a layout-level auth guard is public; `/legal/` is outside `/app/` which is the only authenticated tree. |
| A12 | App Store Connect accepts `verygoodtrip` as the app name (not taken) | Pitfall 8 | Medium — name uniqueness is global; verify by search before Wave 2. |
| A13 | A demo reviewer account can be created server-side (the v1.0 auth flow supports email/password signup) | Pitfall 7 | Low — verified: `POST /auth/register` works in production. |

## Open Questions

1. **Apple Developer Program enrollment status**
   - What we know: `eas.json:24` references `louissoudy2@gmail.com` as the Apple ID; intent to enroll is documented in the milestone.
   - What's unclear: Whether the user has actually enrolled, whether the $99 has been paid, whether the account is in "Active" status (vs. "Pending Identity Verification" — can take days).
   - Recommendation: Wave 2 starts with a human-verify checkpoint: "Confirm Apple Developer Program status is Active and you have access to `appstoreconnect.apple.com`." Block Wave 3 until this is true.

2. **App name availability**
   - What we know: Bundle ID `com.verygoodtrip.app` is set; intent is "verygoodtrip" as the App Store name.
   - What's unclear: Whether `verygoodtrip` is taken in the App Store catalog (FR + global).
   - Recommendation: First action in Wave 2: search `appstoreconnect.apple.com` for "verygoodtrip". If taken, fall back to "verygoodtrip - Coût trajet" or similar; document the chosen name in the plan.

3. **Privacy policy content scope**
   - What we know: We collect email + display_name + user-content (vehicles/trips/favorites/notes); no tracking; no third-party analytics; data stored in EU (Render + Supabase).
   - What's unclear: Whether the user wants a minimalist 1-page policy (≤500 words) or a full GDPR-style one with cookie banner notes.
   - Recommendation: Ship minimalist FR-only at submission (`/legal/privacy` on Vercel); plain prose covering: data collected · purpose · storage · third parties (Mapbox API, Render hosting) · rights · contact · last-updated date. Easy to extend later.

4. **Mapbox public token domain restriction**
   - What we know: `EXPO_PUBLIC_MAPBOX_TOKEN` ships inside the .ipa (visible to any reverse-engineer).
   - What's unclear: Whether the token is currently restricted to the bundle ID `com.verygoodtrip.app` in the Mapbox dashboard.
   - Recommendation: Wave 2 checkpoint includes "Mapbox public token: confirm URL/app-ID restriction is set to `com.verygoodtrip.app`."

5. **Demo account credentials for App Review**
   - What we know: Apple's reviewer needs working credentials to test all authenticated flows.
   - What's unclear: Whether to (a) create a dedicated demo account (preferred) or (b) provide the user's real account.
   - Recommendation: (a) — create `apple-review@verygoodtrip.example` (or any throwaway email the user controls) + a strong password; seed it with one example vehicle so the dashboard isn't empty; document credentials in App Review Information; rotate password after release.

## Project Constraints (from CLAUDE.md)

- **Tech stack fixed:** Expo SDK 54 + React Native 0.81.5; do not introduce conflicting frameworks. **No change to dependencies** in this phase.
- **Mobile EAS build required for Mapbox** — already configured. Production build = EAS cloud build.
- **TollGuru key remains server-side only** — unrelated to iOS submission; no client-side key in the iOS bundle.
- **`master` auto-deploys (Render + Vercel)** — adding `web/src/app/legal/privacy/page.tsx` will be live within minutes on `verygoodtrip.vercel.app/legal/privacy`. Coordinate so the URL exists *before* it's entered into App Store Connect.
- **No secrets committed** — adding `mobile/AuthKey_*.p8` to `.gitignore` is mandatory.
- **No `console.log` in production runtime code** — already enforced; no new violations introduced by this phase.
- **Commit + push after each verified update** — the user's standing preference; this phase produces several small commits (config harden, eas.json fill, privacy page, .gitignore update).
- **Mobile has no test framework** — verification is `npx tsc --noEmit` + manual TestFlight smoke + EAS build success.
- **2-weight typography, no serif (D-11)** — already locked across the app; the privacy page on web should follow the same editorial-dark + Space Grotesk system already on `verygoodtrip.vercel.app`.

## Sources

### Primary (HIGH confidence)
- `mobile/app.config.ts:1-68` (read directly) — current config; basis for Pattern 1.
- `mobile/eas.json:1-34` (read directly) — current EAS profile; basis for Pattern 2.
- `mobile/package.json:1-62` (read directly) — Expo SDK 54, `@rnmapbox/maps` 10.3.1, `expo-apple-authentication` ~8.0.8, no analytics SDKs.
- `mobile/assets/images/` listing — confirms the icon set exists; alpha-channel verification still required pre-submission.
- `mobile/AGENTS.md` — "Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code." — followed for Pattern 1.

### Secondary (MEDIUM confidence — Expo/Apple docs cited, not freshly re-fetched this session)
- `docs.expo.dev/versions/v54.0.0/config/app/` — `ios.config.usesNonExemptEncryption`, `ios.infoPlist`, `ios.privacyManifests` — basis for Pattern 1.
- `docs.expo.dev/guides/apple-privacy` — Expo's declarative privacy manifest API + auto-baseline behavior.
- `docs.expo.dev/submit/ios` — `eas submit` config, ASC API key flow — basis for Pattern 2.
- `developer.apple.com/support/third-party-SDK-requirements` — May 2024 privacy manifest enforcement for known SDKs — basis for Pitfall 2.
- `developer.apple.com/app-store/app-privacy-details` — privacy nutrition + privacy policy URL requirement — basis for Wave 1.
- `developer.apple.com/app-store/review/guidelines/` Guideline 4.8 — Apple Sign-In required when third-party SSO is offered — already satisfied.
- `developer.apple.com/app-store/review/guidelines/` Guideline 5.1.2 — App Tracking Transparency — informs Pitfall 3.

### Tertiary (LOW confidence — assumed from training, flagged for verification in Assumptions Log)
- Apple Developer Program $99/yr USD (A1)
- Apple Review turnaround 24-48h (A2)
- App Store Connect auto-derives smaller iPhone screenshots from 6.7" (A3)
- `@rnmapbox/maps` ships its own privacy manifest entry (A5)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling is already declared in the repo, verified by reading the files directly.
- Architecture patterns: HIGH — Expo SDK 54 config surface is well-documented; the patterns are straightforward extensions of the current config.
- Pitfalls: MEDIUM-HIGH — pitfalls 1, 4, 5, 6, 8 are mechanically verifiable; pitfalls 2, 3, 7 depend on Apple's current automated checks (which can change without notice).
- Apple-side specifics (pricing, review timing, screenshot derivation): MEDIUM — flagged in Assumptions Log; cannot be verified without an active Apple Developer account.

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (30 days) — Apple's policies (privacy manifests, ATT, screenshot rules) evolve every few months; re-verify if submission is delayed beyond this window.
