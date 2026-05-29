<!-- refreshed: 2026-05-29 -->
# Architecture

**Analysis Date:** 2026-05-29

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                         │
├──────────────────────────────┬───────────────────────────────────────────────┤
│        Web (Next.js 15)      │        Mobile (Expo / React Native)            │
│  `web/src/app/`              │  `mobile/app/`                                 │
│  SSR + BFF cookie auth       │  Expo Router file-based routing                │
│  Carbon Design System        │  SecureStore JWT                               │
└──────────────┬───────────────┴────────────────────────┬───────────────────────┘
               │  HTTPS (REST + Bearer JWT)              │  HTTPS (REST + Bearer JWT)
               ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Backend — NestJS API  (`backend/src/`)                    │
│                         Global prefix: /api/v1                                │
│                                                                               │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   auth    │ │ vehicles │ │  trips   │ │favorites │ │  fuel-prices /   │  │
│  │ module    │ │ module   │ │ module   │ │ module   │ │ charging-stations│  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                               │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ MapboxModule │  │ PricesModule│  │  UsersModule │  │  common/ utils    │ │
│  │  (@Global)   │  │             │  │              │  │                   │ │
│  └──────────────┘  └─────────────┘  └──────────────┘  └───────────────────┘ │
└────────────────────────────────────────┬─────────────────────────────────────┘
                                         │ TypeORM / pg driver
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL  (`database.config.ts` — DATABASE_URL or individual DB_* vars)   │
│  Tables: users, vehicle_models, user_vehicles, trips, favorites               │
└──────────────────────────────────────────────────────────────────────────────┘
                                         │
                     ┌───────────────────┼───────────────────┐
                     ▼                   ▼                   ▼
             Mapbox Directions    Opendatasoft           ADEME API
             Geocoding API        (fuel prices,          (vehicle catalog
             `mapbox.service.ts`  IRVE stations)         sync on boot)
```

## Component Responsibilities

| Component | Responsibility | Key File |
|-----------|----------------|----------|
| `AuthModule` | JWT issuance, Passport strategies (local/google/apple), rate-limited login/register | `backend/src/auth/auth.module.ts` |
| `VehiclesModule` | Vehicle catalog (ADEME sync), user garage CRUD, per-vehicle stats | `backend/src/vehicles/vehicles.module.ts` |
| `TripsModule` | Route calculation, cost computation (fuel/EV), trip persistence, history, stats | `backend/src/trips/trips.module.ts` |
| `FavoritesModule` | Saved routes CRUD, ownership enforcement | `backend/src/favorites/favorites.module.ts` |
| `FuelPricesModule` | Nearest fuel station price lookup (Opendatasoft, in-memory cache 1h) | `backend/src/fuel-prices/fuel-prices.module.ts` |
| `ChargingStationsModule` | IRVE station lookup by point or route geometry (Opendatasoft, in-memory cache 1h) | `backend/src/charging-stations/charging-stations.module.ts` |
| `PricesModule` | Returns default reference prices (gas/EV) | `backend/src/prices/prices.module.ts` |
| `MapboxModule` | Geocoding + Directions API proxy (`@Global()` — no re-import needed) | `backend/src/mapbox/mapbox.module.ts` |
| `UsersModule` | User entity repository, findOrCreate for OAuth flows | `backend/src/users/users.module.ts` |
| Web App Layout | Server Component route guard (reads cookie → redirect), wraps authenticated pages | `web/src/app/app/layout.tsx` |
| Web BFF Routes | Set/clear JWT cookie for browser (non-httpOnly, cross-site in prod) | `web/src/app/api/auth/set-cookie/route.ts`, `web/src/app/api/auth/logout/route.ts` |
| Mobile AuthContext | SecureStore token persistence, useSegments routing gate `(auth)` ↔ `(tabs)` | `mobile/src/context/AuthContext.tsx` |
| Shared Types | Pure TypeScript enums + interfaces — no framework dependency | `shared/src/index.ts` |

## Pattern Overview

**Overall:** Modular monorepo — three separate deployable packages (`backend`, `web`, `mobile`) sharing a pure-TypeScript `shared/` package for enums and interfaces.

**Key Characteristics:**
- Backend follows NestJS module pattern: each domain has `module.ts`, `controller.ts`, `service.ts`, `entities/`, `dto/`
- Web uses Next.js 15 App Router with Server Components for auth gating and Client Components for interactive pages
- Auth is stateless JWT on the backend; web stores the token in a non-httpOnly cookie via a BFF route; mobile stores in `expo-secure-store`
- External API calls (Mapbox, Opendatasoft fuel, ODRÉ IRVE) are encapsulated in NestJS services with in-memory caching
- `MapboxModule` is declared `@Global()` so it is available to all modules without explicit import

## Layers

**Controller Layer:**
- Purpose: HTTP routing, input validation (DTOs + class-validator), auth guard application
- Location: `backend/src/<module>/<module>.controller.ts`
- Contains: Route handlers, `@UseGuards(JwtAuthGuard)`, `@CurrentUser()` extraction
- Depends on: Service layer, Guards, DTOs
- Used by: NestJS HTTP adapter

**Service Layer:**
- Purpose: Business logic, external API calls, database queries via TypeORM repositories
- Location: `backend/src/<module>/<module>.service.ts`
- Contains: Cost computation, Mapbox calls, fuel/station lookups, trip persistence
- Depends on: TypeORM `Repository<Entity>`, `MapboxService`, `FuelPricesService`, `ChargingStationsService`
- Used by: Controllers

**Entity Layer:**
- Purpose: Database schema definition via TypeORM decorators
- Location: `backend/src/<module>/entities/*.entity.ts` and `backend/src/trips/entities/`
- Contains: `User`, `VehicleModel`, `UserVehicle`, `Trip`, `Favorite`
- Depends on: TypeORM, `column-transformers.ts` (DECIMAL → number coercion)

**DTO Layer:**
- Purpose: Request shape validation and transformation
- Location: `backend/src/<module>/dto/*.dto.ts`
- Contains: class-validator decorated classes for all POST/PATCH bodies and query params
- Pattern: `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`

**Web Client Layer:**
- Purpose: User interface — authenticated pages are Client Components, root layout and auth layout are Server Components
- Location: `web/src/app/app/*/page.tsx` (authenticated), `web/src/app/(login|register)/page.tsx` (public)
- Contains: React state, `apiClient` (axios) calls, Carbon Design System components
- Depends on: `web/src/lib/api.ts`, `web/src/types/api.ts`, `web/src/components/ui/`

**BFF Layer (Web):**
- Purpose: Cookie management — browser cannot set/delete secure cross-site cookies directly
- Location: `web/src/app/api/auth/`
- Contains: `set-cookie/route.ts` (POST → set cookie), `logout/route.ts` (POST → delete cookie)
- Pattern: Next.js Route Handler (Node.js runtime), never Edge Runtime

## Data Flow

### Trip Calculation (Fuel Vehicle)

1. User submits origin + destination + vehicleId via dashboard (`web/src/app/app/dashboard/page.tsx`)
2. `POST /api/v1/trips/calculate` hits `TripsController.calculate()` (`backend/src/trips/trips.controller.ts:58`)
3. `TripsService.calculate()` fetches `UserVehicle` from DB (`backend/src/trips/trips.service.ts`)
4. `MapboxService.getDirections()` calls Mapbox Directions API → returns distance, duration, GeoJSON geometry (`backend/src/mapbox/mapbox.service.ts`)
5. `FuelPricesService.findNearestStation()` calls Opendatasoft fuel API (or fallback hardcoded prices) for origin and destination (`backend/src/fuel-prices/fuel-prices.service.ts`)
6. `TripsService` computes `consumptionLitres = distanceKm × vehicle.consumption / 100`, `totalCost = consumptionLitres × pricePerLitre`
7. Response includes `distance`, `duration`, `geometry`, `vehicle`, `cost: FuelCost`
8. Web stores result in `sessionStorage['verygoodtrip.pendingTrip']` and navigates to `/app/trips/result`
9. `POST /api/v1/trips/save` persists the trip entity to `trips` table

### Trip Calculation (Electric Vehicle)

Same as above steps 1–4, then:
5. `ChargingStationsService.findStationsAlongRoute()` queries IRVE stations within 2km of the GeoJSON route (`backend/src/charging-stations/charging-stations.service.ts`)
6. `TripsService` computes `consumptionKwh = distanceKm × vehicle.consumption / 100`, `pricePerKwh` from `chargingMode` (home price / public price / weighted mix) using user's vehicle profile
7. Response includes `cost: ElectricCost` with `nearbyStations` (max 20) and a price disclaimer

### Auth Flow — Email/Password (Web)

1. User submits login form → `login()` in `web/src/lib/auth.ts`
2. `POST /api/v1/auth/login` → `AuthController.login()` → `AuthService.login()` → returns `{ accessToken, user }` (`backend/src/auth/auth.service.ts`)
3. Web calls `setAuthCookie(token)` → `POST /api/auth/set-cookie` (Next.js BFF route) → sets non-httpOnly cookie `access_token` with `sameSite: 'none'` in prod (`web/src/app/api/auth/set-cookie/route.ts`)
4. `apiClient` interceptor reads `access_token` cookie and injects `Authorization: Bearer <token>` on every request (`web/src/lib/api.ts:18`)
5. Protected pages under `/app/*` read cookie in Server Component layout, redirect to `/login` if missing (`web/src/app/app/layout.tsx`)

### Auth Flow — OAuth (Google / Apple)

1. Browser navigates to `GET /api/v1/auth/google` → Passport GoogleAuthGuard initiates redirect
2. Google callback → `GET /api/v1/auth/google/callback` → `AuthService.findOrCreateOAuthUser()` (links to existing local account if email matches)
3. Backend redirects to `${FRONTEND_URL}/auth/callback/google?token=<jwt>`
4. Callback page (`web/src/app/auth/callback/google/page.tsx`) reads `?token=`, calls `setAuthCookie()`, then redirects to `/app/dashboard`

### Auth Flow — Mobile

1. Login form → `POST /api/v1/auth/login` → `{ accessToken }`
2. `saveToken(accessToken)` stores in `expo-secure-store` (`mobile/src/auth/storage.ts`)
3. `AuthContext` sets `token` state → `useSegments` effect redirects from `(auth)` to `(tabs)/dashboard`
4. `mobile/src/api/client.ts` interceptor reads token from SecureStore on each request
5. 401 response → `deleteToken()` → `AuthContext` token state clears → routing pushes back to `(auth)/login`

**State Management:**
- Backend: stateless (JWT only). Session used exclusively for OAuth CSRF state (5-minute TTL)
- Web: React `useState` per page + `sessionStorage` for trip calculation handoff + `localStorage` for user price preferences
- Mobile: `AuthContext` (React Context) for token state; `expo-secure-store` for persistence

## Key Abstractions

**`MapboxService` (@Global):**
- Purpose: Wraps Mapbox Geocoding v5 and Directions v5 APIs with typed responses
- File: `backend/src/mapbox/mapbox.service.ts`
- Pattern: `@Global()` NestJS module — injected without explicit import in consuming modules

**`decimalTransformer`:**
- Purpose: Coerces TypeORM DECIMAL/NUMERIC columns from PostgreSQL strings to JS numbers
- File: `backend/src/common/column-transformers.ts`
- Pattern: Applied via `{ transformer: decimalTransformer }` on every `type: 'decimal'` column in all entities

**`JwtAuthGuard` + `@CurrentUser()`:**
- Purpose: Route protection and authenticated user extraction
- Files: `backend/src/auth/guards/jwt-auth.guard.ts`, `backend/src/auth/decorators/current-user.decorator.ts`
- Pattern: Applied at controller class level with `@UseGuards(JwtAuthGuard)`, user retrieved via `@CurrentUser() user: User`

**In-Memory Cache (fuel prices + charging stations):**
- Purpose: Reduce external API calls — TTL 1h keyed by lat/lng/params
- Files: `backend/src/fuel-prices/fuel-prices.service.ts`, `backend/src/charging-stations/charging-stations.service.ts`
- Pattern: `Map<string, { data, expiresAt }>` — no Redis dependency in V1

**`VehicleSyncService`:**
- Purpose: Syncs vehicle catalog from ADEME Car Labelling API on application bootstrap
- File: `backend/src/vehicles/vehicle-sync.service.ts`
- Pattern: `OnApplicationBootstrap` lifecycle hook, idempotent UPSERT by (brand, model, year)

**`PendingTripSession` (Web):**
- Purpose: Passes full trip calculation result (including GeoJSON geometry) from dashboard to result page without URL params
- Storage: `sessionStorage['verygoodtrip.pendingTrip']`
- Consumers: `web/src/app/app/dashboard/page.tsx` (writer), `web/src/app/app/trips/result/page.tsx` (reader)

## Entry Points

**Backend:**
- Location: `backend/src/main.ts`
- Triggers: `node dist/main.js` or `nest start --watch`
- Responsibilities: Creates `NestExpressApplication`, configures `trust proxy 1`, session middleware (OAuth CSRF), Helmet, CORS, global `ValidationPipe`, starts HTTP listener on `PORT` (default 3000)

**Web:**
- Location: `web/src/app/layout.tsx`
- Triggers: Next.js build / `next dev`
- Responsibilities: Root HTML shell, font injection (`Space_Grotesk`, `JetBrains_Mono`), wraps all children in `<Providers>` (ThemeProvider + ToastProvider), sets OG metadata

**Authenticated Web Section:**
- Location: `web/src/app/app/layout.tsx`
- Triggers: Any navigation under `/app/*`
- Responsibilities: Server Component — reads `access_token` cookie, redirects to `/login` if absent, renders `<AppLayout>` (sidebar + topbar)

**Mobile:**
- Location: `mobile/app/_layout.tsx`
- Triggers: Expo Router on app start
- Responsibilities: Initializes i18n, wraps stack in `<AuthProvider>`, sets up `<StatusBar>` and `<Toast>`, renders `<Stack>` navigator

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop. All I/O (Mapbox, Opendatasoft, PostgreSQL) is async/await.
- **Global state:** `MapboxModule` is `@Global()` singleton — one instance per process. In-memory caches in `FuelPricesService` and `ChargingStationsService` are module-scoped singletons (not shared across workers/replicas).
- **Circular imports:** `VehiclesModule` imports `Trip` entity from `trips/entities/` for stats aggregation; `TripsModule` imports `VehiclesModule` for vehicle lookups. This is managed at module level (not circular at module graph level because `VehiclesModule` exports `VehiclesService` and `TripsModule` imports the module, not the other way).
- **Cookie cross-origin:** `access_token` cookie must be `sameSite: 'none'` and `secure: true` in production for cross-origin Vercel ↔ Render communication. Same attributes must be set on logout to allow deletion.
- **`synchronize: false` in production:** Schema is managed exclusively via TypeORM migrations in `backend/src/database/migrations/`. `synchronize: true` only in dev.
- **Edge Runtime exclusion:** Next.js middleware was removed. Auth gating uses Server Components (`cookies()` from `next/headers`) which run in the Node.js runtime. No Edge Runtime code exists in this project.

## Anti-Patterns

### Do Not Use `synchronize: true` in Production

**What happens:** TypeORM `synchronize: true` auto-alters the database schema on startup.
**Why it's wrong:** Can silently drop columns or cause data loss in production.
**Do this instead:** Generate and run migrations (`migration:generate`, `migration:run`). See `backend/src/database/migrations/`.

### Do Not Read `access_token` Cookie as httpOnly

**What happens:** Setting the cookie `httpOnly: true` would block the Axios interceptor from reading it client-side.
**Why it's wrong:** The interceptor in `web/src/lib/api.ts` reads `document.cookie` to build the `Authorization` header. httpOnly cookies are invisible to JS.
**Do this instead:** Keep `httpOnly: false` as currently configured. The token is not a secret in the browser context — it is a Bearer token intended to be sent in headers.

### Do Not Create New Next.js Middleware

**What happens:** A `middleware.ts` was previously present and caused `ReferenceError: __dirname is not defined` on Vercel's Edge Runtime.
**Why it's wrong:** The Edge Runtime cannot use Node.js built-ins. Auth gating via middleware is fragile here.
**Do this instead:** Use Server Component layouts with `cookies()` from `next/headers` (Node.js runtime, see `web/src/app/app/layout.tsx`).

## Error Handling

**Strategy:** NestJS global `ValidationPipe` handles DTO validation errors (400). Services throw `NotFoundException` (404), `ForbiddenException` (403), `BadRequestException` (400). External API failures in `FuelPricesService` and `ChargingStationsService` fall back to hardcoded defaults rather than propagating errors.

**Patterns:**
- HTTP exceptions use NestJS built-ins (`NotFoundException`, `ForbiddenException`, etc.)
- External API timeouts (Mapbox: no explicit timeout; Opendatasoft fuel: 8s) throw `ServiceUnavailableException`
- Web Axios interceptor: 401 → redirect to `/login` (except on auth pages themselves)
- Mobile Axios interceptor: 401 → `deleteToken()` (triggers AuthContext re-route)

## Cross-Cutting Concerns

**Logging:** NestJS `Logger` class used in services and bootstrap. Level set to `['error', 'warn', 'log', 'debug', 'verbose']`. No structured logging library in V1.

**Validation:** `class-validator` + `class-transformer` via global `ValidationPipe`. All incoming DTOs are decorated. `whitelist: true` strips unknown properties. `enableImplicitConversion: true` coerces query param strings to typed primitives.

**Authentication:** `JwtAuthGuard` applied at controller class level to all protected resources. Public routes (`/auth/*`, `/vehicles/catalog`, `/health`) explicitly opt out via their own guards or no guard.

**Rate Limiting:** `ThrottlerGuard` applied globally (100 req/min per IP). Auth routes (`/auth/login`, `/auth/register`) override with `@Throttle({ default: { limit: 5, ttl: 60000 } })`.

**Internationalization:** `nestjs-i18n` with FR default, EN fallback. Translation keys resolved from `backend/src/i18n/{fr,en}/messages.json`. Services receive language via controller helper `detectLang()`. All services use `@Optional() private i18n: I18nService | null` to remain usable in tests without the module.

---

*Architecture analysis: 2026-05-29*
