# Codebase Concerns

**Analysis Date:** 2026-05-29

---

## Security Considerations

### JWT Cookie is Non-HttpOnly (XSS Risk)

- **Risk:** The `access_token` cookie is deliberately set with `httpOnly: false` so the Axios client can read it via `document.cookie`. Any XSS payload on the page can steal the JWT and impersonate the user.
- **Files:** `web/src/app/api/auth/set-cookie/route.ts` (line 28: `httpOnly: false`), `web/src/lib/api.ts` (reads cookie via `document.cookie`)
- **Severity:** HIGH
- **Current mitigation:** Helmet CSP headers on backend; no explicit CSP configured on the Next.js app itself.
- **Recommendations:** Move token into an `httpOnly` cookie and use a CSRF header (e.g., `X-CSRF-Token`) for the backend. The Axios interceptor can inject the CSRF token from a separate non-httpOnly cookie instead of reading the JWT directly.

### SSL Certificate Verification Disabled for DB Connections

- **Risk:** Both production DB paths set `ssl: { rejectUnauthorized: false }`, disabling TLS peer verification. A MITM attacker on the network path between Render and Supabase could intercept database traffic.
- **Files:** `backend/src/config/database.config.ts` (line 24), `backend/src/database/data-source.ts` (line 13)
- **Severity:** MEDIUM (low practical risk on Supabase/Render internal networks, but not zero)
- **Current mitigation:** Supabase connections are TLS-encrypted but the server certificate is not verified.
- **Recommendations:** Obtain Supabase's root CA certificate and set `ca: <cert>` + `rejectUnauthorized: true`, or accept the risk explicitly in a documented architecture decision.

### In-Memory OAuth Session Store

- **Risk:** `express-session` is configured with the default `MemoryStore` (no `store:` option in `main.ts`). If the Render dyno restarts between OAuth initiation and callback (including the Render free-tier 15-minute sleep), the OAuth state is lost and the handshake fails with an authentication error. Cannot be fixed by retrying — user must restart the OAuth flow.
- **Files:** `backend/src/main.ts` (lines 49–60, session middleware)
- **Severity:** MEDIUM
- **Current mitigation:** Session TTL is 5 minutes; short enough to limit exposure window.
- **Recommendations:** Replace `MemoryStore` with a persistent adapter (e.g., `connect-redis` with Upstash Redis, or `connect-pg-simple` against the existing Supabase DB).

### Mapbox Tokens Exposed in Client Bundles

- **Risk:** `NEXT_PUBLIC_MAPBOX_TOKEN` (web) and `EXPO_PUBLIC_MAPBOX_TOKEN` (mobile) are embedded in the JavaScript bundle and visible to anyone who inspects the app. If not domain/app-restricted, anyone can consume the token's quota.
- **Files:** `web/.env.example`, `mobile/.env.example`, `mobile/src/components/MapboxMap.tsx` (line 26: `process.env.EXPO_PUBLIC_MAPBOX_TOKEN`)
- **Severity:** MEDIUM (expected for mapbox-gl client-side usage; risk is quota exhaustion not data breach)
- **Current mitigation:** README and CLAUDE.md document the need to restrict tokens in the Mapbox dashboard. Restriction is manual, not enforced.
- **Recommendations:** Enforce domain restrictions in the Mapbox Access Token dashboard for the web token; enforce iOS/Android App IDs for the mobile token. Add a CI check or startup warning if token restrictions cannot be verified programmatically.

### Apple OAuth Requires HTTPS — Localhost Fallback Won't Work in Production

- **Risk:** `AppleStrategy` defaults to `http://localhost:3000/api/v1/auth/apple/callback` if `APPLE_CALLBACK_URL` is not set. Apple's servers require HTTPS and a registered domain. Any misconfiguration that leaves the default in production causes silent auth failure.
- **Files:** `backend/src/auth/strategies/apple.strategy.ts` (line 26)
- **Severity:** LOW (easily caught during deployment; Apple will reject the redirect)
- **Current mitigation:** Environment variable is documented in `.env.example`.
- **Recommendations:** Assert that `APPLE_CALLBACK_URL` starts with `https://` at application startup if `NODE_ENV === 'production'`.

---

## Tech Debt

### Brand Rename Incomplete — Lockfiles Still Reference "Tripwise"

- **Issue:** The root `package-lock.json` has `"name": "tripwise"` (lines 2 and 8) and `web/package-lock.json` has `"name": "tripwise-web"`. All other package.json files have been updated to `verygoodtrip` variants. The root `package.json` reads `"name": "verygoodtrip"` but the lockfile was not regenerated.
- **Files:** `package-lock.json` (lines 2, 8), `web/package-lock.json` (lines 2, 8)
- **Severity:** LOW (lockfiles are not deployed; cosmetic inconsistency)
- **Fix approach:** Run `npm install` from root and from `web/` to regenerate lockfiles with the updated name. Also update `CLAUDE.md` which still refers to the app as "Tripwise" throughout.

### `simple-enum` in Entities vs. Native PostgreSQL Enum in Migrations

- **Issue:** Three entity columns (`users.provider`, `vehicle_models.fuel_type`, `trips.fuel_type`, `trips.energy_unit`) are declared with TypeORM `type: 'simple-enum'`. `simple-enum` stores values as `varchar`. However, the initial migration (`1747699200000-InitialSchema.ts`) creates native PostgreSQL `CREATE TYPE ... AS ENUM(...)` columns. The column types are structurally mismatched: the entity says "varchar" but the DB has a native enum type. With `synchronize: false` in production this doesn't cause a schema conflict, but TypeORM's type introspection and `migration:generate` will produce false diffs on every run, making automatic migration generation unreliable.
- **Files:** `backend/src/users/entities/user.entity.ts` (line 35), `backend/src/vehicles/entities/vehicle-model.entity.ts` (line 34), `backend/src/trips/entities/trip.entity.ts` (lines 70, 77), `backend/src/database/migrations/1747699200000-InitialSchema.ts`
- **Severity:** MEDIUM
- **Fix approach:** Change entity column type from `'simple-enum'` to `'enum'` (native PG) and add `enumName:` to match the existing Postgres enum type name. This will make `migration:generate` idempotent.

### In-Memory Caches Not Persistent Across Restarts

- **Issue:** Both `FuelPricesService` and `ChargingStationsService` store their cache in a `Map<string, CacheEntry>` instance variable. On Render free tier, the dyno sleeps after 15 minutes of inactivity; all cached data is discarded on wake. The cache also does not survive deployments or horizontal scaling. After each cold start, the first request for each origin/fuel-type combination pays the full external API latency.
- **Files:** `backend/src/fuel-prices/fuel-prices.service.ts` (line 69: `private readonly cache = new Map()`), `backend/src/charging-stations/charging-stations.service.ts` (line 69: `private readonly cache = new Map()`)
- **Severity:** MEDIUM (performance impact, not correctness)
- **Fix approach:** Replace `Map` with a Redis-backed cache (e.g., `ioredis` + Upstash). Key structure and TTLs can remain identical. Alternatively, add a Redis-compatible module and inject it; no interface change needed.

### `TripsService` Exceeds Cohesion Threshold at 726 Lines

- **Issue:** `trips.service.ts` handles geocoding, trip calculation (fuel and electric), multi-energy comparison, CRUD persistence (save/history/stats/update/delete), toll estimation, and duration formatting. This is too many responsibilities for a single service class.
- **Files:** `backend/src/trips/trips.service.ts` (726 lines)
- **Severity:** MEDIUM
- **Fix approach:** Extract into focused services: `TollService` (computeTollCost, estimateFrenchTolls), `TripCalculatorService` (computeFuelCost, computeElectricCost, calculateMulti), and keep `TripsService` for CRUD operations. All three can be injected as needed.

### `dashboard/page.tsx` is 514 Lines of Mixed Concerns

- **Issue:** The web dashboard page mixes: address-mode UI, distance-mode UI, localStorage price reading, sessionStorage trip serialization, multi-energy comparison invocation, stats + KPI display, sparkline data, vehicle selector, recent trips list, and favorites suggestions. It is difficult to test in isolation.
- **Files:** `web/src/app/app/dashboard/page.tsx` (514 lines)
- **Severity:** MEDIUM
- **Fix approach:** Extract `useDashboardData` hook for data fetching, `DashboardCalculator` for the calculation form state, and move the results display into a separate component. The page component should orchestrate composition only.

### ADEME Import Script Has Unset Placeholder URL

- **Issue:** The vehicle catalog import script declares `const ADEME_CSV_URL = 'TODO_REPLACE_WITH_ACTUAL_ADEME_CSV_URL'` and does not have the real ADEME data URL filled in. The script cannot be run to refresh the vehicle catalog. The catalog currently contains data from a one-time manual import.
- **Files:** `backend/src/scripts/import-ademe.ts` (lines 32–34, also TODOs at lines 7, 112, 122)
- **Severity:** LOW (catalog is populated; re-import is not routinely needed; script guards itself at line 223)
- **Fix approach:** Find the current ADEME Car Labelling CSV URL (`https://data.ademe.fr/datasets/ademe-car-labelling`), update the constant, and verify the column name mapping in `mapRow()`.

### Orphaned i18n Message Files on Web

- **Issue:** `web/messages/fr.json` and `web/messages/en.json` exist but are not consumed anywhere. `next-intl` was removed in the 2026-05-27 decision; strings are now hardcoded in French. The message files are misleading — they suggest i18n is active when it is not.
- **Files:** `web/messages/fr.json`, `web/messages/en.json`
- **Severity:** LOW
- **Fix approach:** Delete both files, or move them to `web/.i18n-drafts/` with a clear comment that they are V2 placeholders. Update the i18n section of `CLAUDE.md` to reflect that web i18n is disabled.

### Fallback Fuel Prices Inconsistent Across Codebase

- **Issue:** Four different sets of fallback prices coexist with different values:
  - `fuel-prices.service.ts`: `SP95: 1.75, DIESEL: 1.68`
  - `calculation-constants.ts`: `DEFAULT_GAS_PRICE: 1.85, DEFAULT_DIESEL_PRICE: 1.65`
  - `web/src/app/app/fuel-prices/page.tsx`: `FALLBACK_DEFAULTS: { gas: 1.85, diesel: 1.65 }`
  - `web/src/app/app/dashboard/page.tsx`: `FALLBACK_PRICES: { gas: 1.75, diesel: 1.68 }`
- **Files:** `backend/src/fuel-prices/fuel-prices.service.ts` (lines 35–42), `backend/src/common/calculation-constants.ts`, `web/src/app/app/fuel-prices/page.tsx` (lines 29–37), `web/src/app/app/dashboard/page.tsx` (lines 39–47)
- **Severity:** MEDIUM (confusing, and produces different cost estimates depending on which fallback is hit)
- **Fix approach:** Define a single source of truth (e.g., expand `calculation-constants.ts` to cover all fuels, and import it everywhere — or expose a `/prices/defaults` endpoint hit by both web and backend paths).

### No JWT Refresh Token / Revocation

- **Issue:** The JWT access token has a 7-day TTL with no refresh mechanism and no revocation list. After expiry, the user must log in again. A stolen token is valid for up to 7 days with no way to invalidate it server-side.
- **Files:** `backend/src/auth/auth.service.ts` (token generated in `buildAuthResponse`), `backend/src/auth/auth.module.ts`
- **Severity:** MEDIUM
- **Fix approach:** Add a short-lived access token (15 min) and a long-lived refresh token stored in an httpOnly cookie. On refresh, rotate both tokens. Maintain a refresh-token table in Postgres for revocation.

### `synchronize: true` in Development Risks Accidental Production Schema Modification

- **Issue:** `database.config.ts` sets `synchronize: !isProd`. If `NODE_ENV` is omitted or wrong when connecting to a production `DATABASE_URL`, TypeORM auto-syncs the schema and may drop/alter tables.
- **Files:** `backend/src/config/database.config.ts` (line 15)
- **Severity:** MEDIUM (operational risk; data loss possible)
- **Fix approach:** Change to `synchronize: false` unconditionally and rely on `migration:run`. For local dev convenience, gate synchronize on an explicit `DB_SYNCHRONIZE=true` env variable rather than the absence of `NODE_ENV=production`.

---

## Known Bugs

### Mobile Tab Icons Always Return Null

- **Symptoms:** The bottom tab bar shows labels only; no icons are rendered. `TabIcon` always returns `null`.
- **Files:** `mobile/app/(tabs)/_layout.tsx` (line 16: `return null; // icon rendered via tabBarLabel only`)
- **Trigger:** Every render of the tab bar.
- **Workaround:** Labels are shown; the app is functional. The comment explains the situation.

### Mobile Has Pre-Existing TypeScript Errors

- **Symptoms:** Running `tsc --noEmit` in `mobile/` produces approximately 7 errors. Known sources:
  - The `Colors[scheme]` index pattern: `useColorScheme()` returns `ColorSchemeName | null`. After `?? 'light'` the type is `'light' | 'dark'`, but TypeScript may not narrow the index correctly depending on version.
  - `@rnmapbox/maps` component overloads: `ShapeSource` and `MapView` typed as `React.ComponentType<object>` do not declare a `children` prop, which React 18/19 strict JSX requires explicitly. The workaround in `MapboxMap.tsx` manually casts each component to include `children: React.ReactNode`, but the inner `<MV>` wrapper still receives JSX children from the outer scope which may not match.
  - Unused `icons` variable inside `TabIcon` function.
- **Files:** `mobile/app/(tabs)/_layout.tsx`, `mobile/src/components/MapboxMap.tsx`, `mobile/constants/theme.ts`
- **Trigger:** `cd mobile && npx tsc --noEmit`
- **Workaround:** None currently; the build still succeeds via Expo bundler which skips TypeScript errors.

### Google OAuth Deep Link Not Registered for Production Mobile

- **Symptoms:** The mobile login screen calls `WebBrowser.openAuthSessionAsync` with redirect `verygoodtrip://auth/callback`. This scheme is only registered during development builds via `app.config.ts`. In Expo Go, deep links to custom schemes are not routable, so the OAuth callback token is never received.
- **Files:** `mobile/app/(auth)/login.tsx` (lines 61–68)
- **Trigger:** Tapping "Google Login" in Expo Go.
- **Workaround:** Use a native dev build (`eas build --profile development`).

---

## Performance Bottlenecks

### Electric Trip Calculation: Sequential IRVE API Fan-Out

- **Problem:** `ChargingStationsService.findStationsAlongRoute` samples up to 10 points from the route geometry and fires one `fetch()` per point with `Promise.all()`. Each fetch call hits the IRVE Opendatasoft API with an 8-second timeout. For a long route, this means up to 10 parallel external calls. If any single call is slow, the entire `/trips/calculate` response is delayed.
- **Files:** `backend/src/charging-stations/charging-stations.service.ts` (lines 86–99)
- **Cause:** No batching in the IRVE API; must sample individual points.
- **Improvement path:** Reduce the sample count from 10 to 5 for routes under 300 km. Pre-warm the cache asynchronously (background job) for popular corridors. Add a circuit breaker: if one point fetch times out, return partial results rather than waiting for all.

### Render Free Tier Cold Start Latency

- **Problem:** On the Render free tier, the backend dyno sleeps after 15 minutes of inactivity. The first request after sleep takes 30–60 seconds (dyno wake + NestJS bootstrap + DB connection pool). The web client has a 30-second Axios timeout; cold-start requests will succeed but the user sees a long spinner.
- **Files:** `web/src/lib/api.ts` (line 16: `timeout: 30000`), Render deployment configuration
- **Cause:** Free tier service suspension.
- **Improvement path:** Upgrade to a paid Render plan with always-on, or implement a health-check ping (cron job to `GET /api/v1/health` every 10 minutes).

### Toll Estimation Uses Average Speed Heuristic (Inaccurate)

- **Problem:** Without `TOLLGURU_API_KEY`, toll costs are estimated from the ratio of average speed to motorway speed threshold. A 600 km motorway trip at 100 km/h gets 70% toll fraction; a 600 km trip on a slow motorway at 98 km/h gets 45%. The €0.09/km rate is a national average and does not reflect actual concession tariffs (e.g., Vinci vs. APRR vs. ASF).
- **Files:** `backend/src/trips/trips.service.ts` (lines 699–717: `estimateFrenchTolls`)
- **Cause:** TollGuru API key not configured; heuristic is the only fallback.
- **Improvement path:** Obtain a TollGuru API key (free tier covers 500 req/month). Flag the response with `tollIsEstimate: true` (already done) and surface this prominently in the UI.

---

## Fragile Areas

### OAuth Callback State Lost on Dyno Restart

- **Files:** `backend/src/main.ts` (session middleware), `backend/src/auth/strategies/google.strategy.ts`, `backend/src/auth/strategies/apple.strategy.ts`
- **Why fragile:** Passport's OAuth strategies use the session to store the `state` parameter for CSRF verification. With `MemoryStore`, a restart between "initiate OAuth" and "callback received" causes a `Failed to serialize user into session` or state mismatch error.
- **Safe modification:** Any change to session configuration or deployment settings can break the OAuth flow. Always test end-to-end OAuth after changes.
- **Test coverage:** E2E tests for auth mock the OAuth strategies entirely; no test exercises the actual session state round-trip.

### `decimalTransformer` Required on Every New DECIMAL Column

- **Files:** `backend/src/common/column-transformers.ts`, all `*.entity.ts` files with `type: 'decimal'`
- **Why fragile:** If a developer adds a new `decimal` column without the `transformer: decimalTransformer` option, the column will return a string from PostgreSQL. This causes silent runtime errors (`.toFixed is not a function`) that only appear when reading from the DB, not during the write path or in tests using SQLite.
- **Safe modification:** Always apply `transformer: decimalTransformer` to every `type: 'decimal'` column.
- **Test coverage:** E2E tests use SQLite which returns numeric types natively, masking this issue.

### Web Auth Guard Is Cookie-Only (Token Validation Deferred to Backend)

- **Files:** `web/src/app/app/layout.tsx`
- **Why fragile:** The server-side layout only checks for the presence of the `access_token` cookie, not its validity (not decoded, not checked for expiry). An expired or invalid token passes the guard; the page renders and the first API call returns 401, triggering a client-side redirect to `/login`.
- **Safe modification:** This is intentional (avoid secret JWT key in Next.js runtime). But it means protected pages briefly render before redirecting on expired tokens. Any new protected layout must replicate this pattern.
- **Test coverage:** No tests for the auth layout behaviour.

---

## Scaling Limits

### External API Rate Limits

- **Mapbox:** Geocoding and Directions APIs have a free-tier limit (approximately 100,000 requests/month, but subject to change per Mapbox dashboard). The geocode proxy at `GET /trips/geocode` has no per-user or per-session rate limit beyond the global 100 req/min throttle. A single user doing rapid autocomplete (e.g., debounce 300 ms, typing 10 characters) generates ~30 geocode requests/minute easily within the global limit but still counts against the Mapbox quota.
- **IRVE / Opendatasoft:** No API key required; rate limits are not published. Concurrent users calculating electric trips each trigger up to 10 parallel IRVE requests.
- **prix-carburants.gouv.fr:** No API key; undocumented rate limits.

### Vehicle Catalog Size (~266 Models)

- **Current capacity:** 266 vehicle models in `vehicle_models` table.
- **Limit:** No inherent limit, but the catalog search (`GET /vehicles/catalog`) does not have full-text search. The LIKE query `LOWER(brand) LIKE :search OR LOWER(model) LIKE :search` is not indexed.
- **Scaling path:** Add a GIN index on a tsvector column or use Postgres `pg_trgm` extension for fuzzy search. For now, 266 rows with a LIKE scan is fast enough.

---

## Test Coverage Gaps

### No Tests for the Web Application

- **What's not tested:** All Next.js pages, React components, Axios client, cookie handling, auth guard, form validation, localStorage/sessionStorage interactions.
- **Files:** Entire `web/src/` directory (0 test files)
- **Risk:** Regressions in auth flow, form submission, and API integration go undetected.
- **Priority:** High — the web app is the primary deployed user interface.

### No Tests for the Mobile Application

- **What's not tested:** All Expo screens, AuthContext, SecureStore wrapper, Mapbox component fallback logic, i18next setup.
- **Files:** Entire `mobile/` directory (0 test files)
- **Risk:** Silent breakage on Expo SDK upgrades or React Native version changes.
- **Priority:** Medium — mobile is not yet deployed.

### Backend Unit Test Coverage Is Minimal

- **What's not tested:** `FuelPricesService.fetchNearby` (cache hit/miss logic), `ChargingStationsService.mapRecord`, `VehiclesService.addUserVehicle` (isDefault transaction), `AuthService.findOrCreateOAuthUser` (linking edge cases), all DTO validators.
- **Files:** Only two unit test files exist: `backend/src/app.controller.spec.ts` and `backend/src/trips/trips.service.spec.ts`
- **Risk:** Business logic bugs in the calculation or auth linking paths are only caught by e2e tests which mock all external services.
- **Priority:** Medium — e2e coverage at 136 tests is substantial but does not substitute for unit-level isolation.

### E2E Tests Mock All External APIs

- **What's not tested:** Real Mapbox API responses, real prix-carburants.gouv.fr responses, real IRVE API responses. Tests verify internal logic against mocked shapes, not actual API contracts.
- **Files:** All test files under `backend/test/` (MapboxService, FuelPricesService, ChargingStationsService all mocked via `jest.mock`)
- **Risk:** If an external API changes its response shape, the application breaks at runtime with no test signal.
- **Priority:** Low — contract testing for free public APIs is complex; monitoring is a more practical alternative.

---

## Missing Critical Features

### No Email Verification

- **Problem:** Users can register with any email address without verifying ownership. Typos in email prevent later account recovery. This also allows impersonation of other users' email addresses.
- **Blocks:** Password reset, account recovery.

### No Password Reset Flow

- **Problem:** Users who forget their password on a local account have no self-service recovery path. There is no `POST /auth/forgot-password` or token-based reset endpoint.
- **Blocks:** User retention after forgotten password.

### Mobile App Not Configured for Production Distribution

- **Problem:** The `eas.json` defines build profiles, but `MAPBOX_DOWNLOAD_TOKEN` (needed for `@rnmapbox/maps` native build) has not been set as an EAS secret. No production build has been created. Apple Developer Program membership and App Store Connect configuration are required for iOS distribution.
- **Files:** `mobile/eas.json`, `mobile/app.config.ts`
- **Blocks:** App Store / Play Store release.

---

*Concerns audit: 2026-05-29*
