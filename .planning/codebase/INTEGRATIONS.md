# External Integrations

**Analysis Date:** 2026-05-29

## APIs & External Services

### Mapbox — Geocoding & Directions

**Geocoding v5 (forward):**
- Service: Address autocomplete for trip origin/destination
- Endpoint: `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`
- Params: `access_token`, `language=fr`, `country=fr`, `types=address,place,poi`
- SDK/Client: native `fetch` (Node.js) in `backend/src/mapbox/mapbox.service.ts`
- Client-side (web): `mapbox-gl ^3.24.0` in `web/src/components/MapboxMap.tsx` (dynamic, SSR disabled)
- Client-side (mobile): `@rnmapbox/maps ^10.3.1` in `mobile/src/components/MapboxMap.tsx`

**Directions v5 (driving):**
- Service: Route distance, duration, and GeoJSON LineString geometry
- Endpoint: `https://api.mapbox.com/directions/v5/mapbox/driving/{lng,lat;lng,lat}`
- Params: `access_token`, `geometries=geojson`, `overview=full`, `steps=false`
- SDK/Client: native `fetch` in `backend/src/mapbox/mapbox.service.ts`
- Error handling: 401 → `InternalServerErrorException`, 429 → `ServiceUnavailableException`, network → `ServiceUnavailableException`

**Auth:**
- Backend: `MAPBOX_TOKEN` env var → read by `ConfigService` in `MapboxService` constructor
- Web public: `NEXT_PUBLIC_MAPBOX_TOKEN` env var (visible in JS bundle — restrict to allowed domains in Mapbox dashboard)
- Mobile public: `EXPO_PUBLIC_MAPBOX_TOKEN` env var (visible in bundle — restrict to app IDs)
- Mobile build-time secret: `MAPBOX_DOWNLOAD_TOKEN` (EAS secret, scope `DOWNLOADS:READ`, used by `@rnmapbox/maps` native build)

**Quota:** ~100,000 req/month on free plan (verify at account.mapbox.com — subject to change)

---

### Opendatasoft / data.economie.gouv.fr — Fuel Prices

- Service: Nearest petrol station prices for SP95, SP95-E10, SP98, Diesel, E85, GPL
- Dataset: `prix-des-carburants-en-france-flux-instantane-v2`
- Endpoint: `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records`
- Filter: `distance(geom, geom'POINT(lng lat)', 20km)`, ordered by distance
- Response: prices in millièmes d'euro (÷1000 for €/L)
- SDK/Client: native `fetch` with `AbortSignal.timeout(8000)` in `backend/src/fuel-prices/fuel-prices.service.ts`
- Auth: None required (public dataset)
- Cache: in-memory `Map<string, CacheEntry>`, TTL 1 hour, key `lat:lng:fuelType:count` (lat/lng rounded to 4 decimals)
- Fallback: hardcoded average prices in `FuelPricesService.buildFallback()` when API unavailable or returns 0 results

---

### Opendatasoft / ODRÉ — EV Charging Stations (IRVE)

- Service: Electric vehicle charging stations near a point or along a route
- Dataset: Base nationale IRVE (Infrastructure de Recharge pour Véhicules Électriques)
- Endpoint: `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records`
- Filter: `within_distance(coordonneesXY, geom'POINT(lng lat)', Xkm)`
- Fields returned: id, station name, operator, address, coordinates, power (kW), connector types, opening hours, access type
- SDK/Client: native `fetch` with `AbortSignal.timeout(8000)` in `backend/src/charging-stations/charging-stations.service.ts`
- Auth: None required (public dataset)
- Cache: in-memory `Map<string, CacheEntry>`, TTL 1 hour, key `lat:lng:radiusKm`
- Along-route algorithm: samples ≤10 evenly-spaced points from GeoJSON LineString, fires parallel API calls, deduplicates by `id_pdc_itinerance`
- Note: IRVE contains NO pricing data — charging costs come from user vehicle profile

---

### ADEME Car Labelling — Vehicle Catalog

- Service: Official French vehicle fuel consumption catalog (government open data)
- Dataset: ADEME Car Labelling
- Endpoint: `https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines`
- Pagination: 1000 records/page, cursor-based (`next` field)
- SDK/Client: native `fetch` (pagination loop) in `backend/src/vehicles/vehicle-sync.service.ts`
- Auth: None required
- Trigger: On application bootstrap (`OnApplicationBootstrap`) — runs in background if catalog < 500 entries
- UPSERT logic: insert-or-skip by `(brand, model, year)` via `findOneBy` — idempotent
- Consumption mapping: Electric → Wh/km × 0.1 = kWh/100km; Thermal → L/100km (WLTP average of Min/Max)
- Fuel type mapping: `ESSENCE→SP95`, `GAZOLE→DIESEL`, `ELECTRIC→ELECTRIC`, `SUPERETHANOL→E85`, `ESS+G.P.L.→GPL`, hybrids mapped to primary fuel
- Manual import script: `backend/src/scripts/import-ademe.ts` (CSV-based, idempotent UPSERT)
- Batch write size: 100 records per save batch

---

### Google OAuth 2.0

- Service: Social login (web + mobile)
- Backend strategy: `passport-google-oauth20 ^2.0.0` (`backend/src/auth/strategies/google.strategy.ts`)
- Backend endpoints: `GET /api/v1/auth/google` → `GET /api/v1/auth/google/callback`
- Callback URL: `GOOGLE_CALLBACK_URL` env var (dev: `http://localhost:3000/api/v1/auth/google/callback`, prod: full domain)
- Web flow: redirect → backend OAuth → callback page (`web/src/app/auth/callback/google/page.tsx`) receives `?token=` → BFF route sets `httpOnly` cookie
- Mobile flow: `expo-web-browser.openAuthSessionAsync` → backend OAuth → deep link `verygoodtrip://auth/callback?token=...`
- Auth: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars; strategy disabled if vars missing (warns in logs)
- Session: `express-session` (5-min cookie) used only for OAuth state CSRF during handshake; app auth is stateless JWT

---

### Apple Sign In

- Service: Social login (iOS mandatory)
- Backend strategy: `passport-apple ^2.0.2` (`backend/src/auth/strategies/apple.strategy.ts`)
- Backend endpoints: `GET /api/v1/auth/apple` → `GET /api/v1/auth/apple/callback`
- Callback URL: `APPLE_CALLBACK_URL` env var (requires HTTPS domain in prod — localhost not allowed by Apple)
- Mobile: `expo-apple-authentication ~8.0.8` (iOS native, physical device in production)
- Auth: `APPLE_CLIENT_ID` (Service ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (.p8 file content, single line with `\n`)
- Strategy disabled if any of the four vars missing
- Note: Apple only returns email on first login; subsequent logins contain only `sub` (Apple unique ID) — handled in `AuthService.findOrCreateOAuthUser()`

---

### TollGuru (Optional / Inactive)

- Service: Toll cost estimation along a route
- Referenced in `backend/.env.example`: `TOLLGURU_API_KEY` (leave empty to disable)
- Referenced in entity `backend/src/trips/entities/trip.entity.ts`: `tolls_cost NUMERIC(8,2) DEFAULT 0`
- Referenced in `backend/src/trips/dto/save-trip.dto.ts`
- No active service file detected — field is stored but calculation is not implemented in the current codebase (future roadmap item)

---

## Data Storage

**Databases:**
- PostgreSQL 16
  - Local dev: Docker Compose (`docker-compose.yml`), port 5432
  - Production: Supabase / Neon / Render Postgres via `DATABASE_URL` env var
  - Connection: `DATABASE_URL` (priority) or individual `DB_HOST/PORT/USERNAME/PASSWORD/NAME`
  - SSL: `{ rejectUnauthorized: false }` required for Supabase/Neon external connections
  - ORM: TypeORM 1.x (`@nestjs/typeorm ^11.0.1`)
  - Migration path: `backend/src/database/migrations/*.ts`
  - CLI DataSource: `backend/src/database/data-source.ts`
  - `synchronize: true` in dev (auto-schema), `false` in production

**File Storage:**
- Local filesystem only — no S3 or blob storage detected

**Caching:**
- In-memory `Map` objects in `FuelPricesService` and `ChargingStationsService` — process-level, 1-hour TTL, no Redis
- No distributed cache — cache is lost on process restart

## Authentication & Identity

**Auth Provider:** Custom JWT + OAuth (no third-party auth SaaS)

**Implementation:**
- Passwords: bcrypt (salt 12) via `bcrypt ^6.0.0`
- Tokens: `@nestjs/jwt`, 7-day expiry, secret from `JWT_SECRET`
- Guard: `JwtAuthGuard` (reusable), decorator `@CurrentUser()`
- Web: JWT stored in cookie `access_token` (non-httpOnly — read by Axios interceptor); set via BFF route `web/src/app/api/auth/set-cookie/route.ts`; cleared by `web/src/app/api/auth/logout/route.ts`
- Mobile: JWT in `expo-secure-store` (encrypted native storage); read by `mobile/src/api/client.ts`
- Rate limiting on auth routes: 5 req/min (via `@nestjs/throttler`)

## Monitoring & Observability

**Error Tracking:** Not detected (no Sentry, Datadog, or similar)

**Logs:**
- NestJS built-in `Logger` class used throughout services (`new Logger(ClassName.name)`)
- Log levels: `['error', 'warn', 'log', 'debug', 'verbose']` (all enabled in `backend/src/main.ts`)
- No structured logging or log aggregation service detected

## CI/CD & Deployment

**Hosting:**
- Backend: Render (Node.js service, Docker-based)
  - `trust proxy 1` in `backend/src/main.ts` for Render's NGINX reverse proxy
  - `@nestjs/cli`, `typescript`, `ts-loader` kept in `dependencies` (needed for `nest build` on Render)
- Frontend Web: Vercel
  - Monorepo config: Vercel dashboard or `vercel.json` (at repo root) pointing to `web/package.json`
  - All `/app/*` routes force dynamic rendering (`export const dynamic = 'force-dynamic'` in `web/src/app/app/layout.tsx`)
- Mobile: Expo EAS Build → App Store (iOS) / Google Play (Android)
  - EAS CLI version: `>= 16.0.0`
  - iOS bundle ID: `com.verygoodtrip.app`
  - Android package: `com.verygoodtrip.app`

**CI Pipeline:** Not detected (no GitHub Actions, CircleCI, or similar)

## Environment Configuration

**Required env vars — Backend (production):**
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...` (Supabase / Neon / Render Postgres)
- `JWT_SECRET` (≥ 64 chars)
- `MAPBOX_TOKEN`
- `CORS_ORIGINS=https://verygoodtrip.vercel.app`
- `FRONTEND_URL=https://verygoodtrip.vercel.app`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (OAuth — optional)
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CALLBACK_URL` (OAuth — optional)

**Required env vars — Web (production):**
- `NEXT_PUBLIC_API_URL=https://backend.onrender.com/api/v1`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (restrict to Vercel domain in Mapbox dashboard)

**Required env vars — Mobile (EAS):**
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_MAPBOX_TOKEN` (restrict to app ID in Mapbox dashboard)
- `MAPBOX_DOWNLOAD_TOKEN` (EAS secret, `DOWNLOADS:READ` scope — do NOT prefix `EXPO_PUBLIC_`)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (optional, for OAuth)

**Secrets location:**
- Backend: `backend/.env` (gitignored); `.env.example` committed as template
- Web: `web/.env.local` (gitignored); `.env.example` committed as template
- Mobile: `mobile/.env` (gitignored); `.env.example` committed as template; `MAPBOX_DOWNLOAD_TOKEN` in EAS secrets

## Webhooks & Callbacks

**Incoming OAuth Callbacks:**
- `GET /api/v1/auth/google/callback` — Google OAuth redirect target
- `GET /api/v1/auth/apple/callback` — Apple Sign In redirect target

**Deep Links (Mobile):**
- Scheme: `verygoodtrip://`
- OAuth callback: `verygoodtrip://auth/callback?token=...`

**Outgoing:**
- None detected

---

*Integration audit: 2026-05-29*
