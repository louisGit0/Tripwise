---
phase: 09-ios-app-store-release
type: context
requirements: [REL-01]
created: 2026-06-03
---

# Phase 9 — iOS App Store Release · CONTEXT

## Goal
Publish the Expo app to the iOS App Store. The agent prepares all code/config/assets
release-ready; the user owns the Apple Developer Program account, credentials/2FA,
the EAS build/submit runs, screenshots, and the Apple review. Google Play deferred.

## Pre-flight findings (scouted 2026-06-03)
- `mobile/app.config.ts`: `bundleIdentifier: com.verygoodtrip.app`, `version: 1.0.0`,
  `usesAppleSignIn: true`, splash + `@rnmapbox/maps` plugin (needs `MAPBOX_DOWNLOAD_TOKEN`),
  `extra.apiUrl`/`mapboxToken` from `EXPO_PUBLIC_*` with **localhost fallback**.
- `mobile/eas.json`: dev/preview/production build profiles; `production` has `autoIncrement: true`
  but **no `env`** → a prod build would inherit the localhost API fallback. ❌
- Icon `assets/images/icon.png` = **1024×1024** ✅ (App Store marketing icon derived from it).
- **No `expo-location`** anywhere; the Mapbox map does **not** request user location →
  **no location permission string required.** ✅
- No tracked `.env` in `mobile/` (only `.env.example`) ✅.
- No `/privacy` page on the web → Apple requires a Privacy Policy URL (and a Support URL).

## Decisions (locked)

### D-36 — Identity
- Bundle ID **`com.verygoodtrip.app`** (already set; matches Android package). App name
  **verygoodtrip**. Version **1.0.0**, build number **auto-incremented by EAS** (`autoIncrement`).

### D-37 — Production build env via EAS environment variables (not committed)
The production iOS build must hit the **real backend**, not localhost. Provide via
**EAS environment variables scoped to `production`** (set once by the user; never committed):
- `EXPO_PUBLIC_API_URL` = real Render backend URL, e.g. `https://<render-app>.onrender.com/api/v1`
- `EXPO_PUBLIC_MAPBOX_TOKEN` = public Mapbox token (restrict to the iOS bundle id in the Mapbox dashboard)
- `MAPBOX_DOWNLOAD_TOKEN` = **secret** Mapbox token, scope `DOWNLOADS:READ` (build-time only)
Rationale: keeps the prod URL + tokens out of git; the runbook makes setting these a hard gate
before the first production build.

### D-38 — iOS Info.plist / encryption
- Add `ios.infoPlist.ITSAppUsesNonExemptEncryption = false` (app uses only standard HTTPS) to
  skip the export-compliance question on every submit.
- No location / camera / photo / mic permissions (none used).
- Apple Sign In handled by `expo-apple-authentication` + `usesAppleSignIn: true`.
- Privacy manifest: rely on Expo SDK 54 module-level manifests (auto-merged); no app-level
  required-reason API used directly by our code.

### D-39 — Privacy Policy + Support URL via the web app
Create a public **`/privacy`** page on the existing Next.js/Vercel deployment (editorial-dark,
FR, RGPD). It doubles as the Support contact (email). This satisfies both Apple-required URLs.

### D-41 — Sign in with Apple account-deletion (HARD App Review blocker, guideline 5.1.1)
Apple has required since June 2022 that any app offering Sign in with Apple ALSO offers in-app
account deletion. Today `usesAppleSignIn: true` is set but **no `DELETE /users/me` exists** and
neither Settings screen has a "Supprimer mon compte" entry. App Review WILL reject without this.

**Required slice (separate small plan inside Phase 9):**
- Backend: `DELETE /users/me` (JWT-guarded, `@CurrentUser`), TypeORM cascades already wired on
  `User → UserVehicle / Favorite / Trip`. Returns 204. e2e: 204 + 401-no-token + subsequent
  `/auth/me` → 401.
- Web: `app/settings` danger-zone "Supprimer mon compte" → confirm Modal → `DELETE /users/me`
  → logout BFF → redirect `/`.
- Mobile: `(tabs)/settings.tsx` danger-zone Button (`fuelGas`) → Alert.alert confirm →
  `client.delete('/users/me')` → `signOut()` → routes to `(auth)`.

### D-42 — iPad: flip `ios.supportsTablet` to `false` for v1.0
Currently `true` in `app.config.ts`. If left `true`, App Review requires a full set of 12.9" iPad
screenshots — we have no iPad-optimized layout to screenshot. Flip to `false` for v1.0; revisit
when iPad is an actual target. Phone-only requires 6.7" (iPhone 15/16 Pro Max) + 6.5"
(iPhone 11 Pro Max) screenshot sets only.

### D-43 — Submission tooling: App Store Connect API key (.p8), not Apple ID password
`eas submit` supports two auth modes; pick the **App Store Connect API key**:
- Generate `.p8` at App Store Connect → Users and Access → Integrations → Keys, role "App Manager".
- Provide via `eas secret:create` (or `--asc-api-key-*` flags).
- Avoids 2FA prompts, works headlessly, doesn't expire on password changes.

### D-44 — App Store Connect listing draft (FR-only at launch)
- **Name**: `verygoodtrip`
- **Subtitle (≤30 chars)**: `Coût réel d'un trajet voiture`
- **Primary category**: Travel · **Secondary**: Navigation
- **Age rating**: 4+
- **Keywords (≤100 chars)**: `trajet,voiture,péage,carburant,coût,essence,diesel,électrique,EV,GPL`
- **Promotional text (≤170 chars)**: `Calculez le coût total de votre trajet en voiture
  (carburant + péages) en quelques secondes. Trajets, favoris, statistiques.`
- **Screenshots (5 phones, FR only)**: (1) Dashboard avec calcul Paris→Lyon; (2) Résultat trajet
  (coût total + DataBar énergie/péage + AnimatedCounter); (3) Garage avec photo véhicule;
  (4) Showroom catalogue (recherche + photos); (5) Paramètres. Seeded with realistic data — no
  Lorem.
- **App Preview video**: skip for v1.0 (optional; can add later without new build).
- **Reviewer demo account**: create a real backend user with seeded vehicles + a couple of
  trips. Provide email/password in App Review Information so the reviewer can log in WITHOUT
  Sign in with Apple. Required to avoid back-and-forth.
- **Reviewer notes (FR + EN)**: explain tolls are clearly labelled as estimates, energy uses
  ADEME/EPA reference consumption + Mapbox routing, all third-party data is public open data
  (data.gouv.fr, Opendatasoft) or the user's own configuration.

### D-45 — Plan waves (proposed)
- **Wave 1 (BLOCKING)**: REL-04 account-deletion slice (D-41) + `/privacy` + `/support` static
  pages on Vercel (D-39). Must land BEFORE submission.
- **Wave 2 (parallel)**: `ios.supportsTablet: false` + `ITSAppUsesNonExemptEncryption: false`
  in `app.config.ts` (D-38, D-42); privacy-manifest audit (verify `@rnmapbox/maps`,
  `react-native-reanimated`, `expo-secure-store` ship their own `PrivacyInfo.xcprivacy`).
- **Wave 3 (asset prep)**: 5 FR phone screenshots @ 6.7" + 6.5" rendered from a seeded prod
  build on a real iPhone (or simulator at exact device sizes).
- **Wave 4 (USER-OWNED prerequisites — agent BLOCKS until done)**: Apple Developer Program
  enrollment ($99/yr, 24–48h approval); App Store Connect app shell creation (bundle id
  `com.verygoodtrip.app`, primary lang FR, SKU = bundle id); App Store Connect API key (`.p8`,
  D-43); send `appleTeamId` + `ascAppId` to drop into `eas.json`; set EAS env vars (D-37).
- **Wave 5**: `eas build --platform ios --profile production` → TestFlight internal smoke on a
  physical iPhone (Apple Sign In cert chain only works on real device) → `eas submit
  --platform ios --profile production --latest` → fill listing fields → submit to Review.

### D-40 — Division of labor
**Agent prepares:** app.config production fields, eas.json review, `/privacy` page, App Store
metadata draft (FR), App Privacy nutrition-label answers, and a step-by-step EAS + App Store
Connect runbook.
**User owns (account/credential/Apple-gated, cannot be automated):** Apple Developer Program
account, `eas login`, creating the EAS production env vars, the App Store Connect app record
(→ provides **Apple Team ID** + **ASC App ID** to fill `eas.json`), `eas build`/`eas submit`,
screenshots, and Apple review submission.

## App Privacy (nutrition labels) — source of truth
- **Contact info → Email address**: collected for account creation. Linked to identity. Purpose:
  App Functionality. Not used for tracking.
- **User content → vehicles, trips, favorites, display name**: linked to identity. Purpose:
  App Functionality. Not used for tracking.
- **Identifiers**: none for advertising. No third-party SDK tracking. **No data used to track.**
- Functional third parties (not advertising): Mapbox (maps/geocoding), CarImages (vehicle photos,
  server-side proxy), data.gouv/Opendatasoft (fuel/charging/toll data), Render+Vercel (hosting).

## Out of scope (deferred)
- Google Play release (explicit user decision: "iOS maintenant, Google Play plus tard").
- In-app purchases, push notifications, deep-link universal links.
