# Codebase Structure

**Analysis Date:** 2026-05-29

## Directory Layout

```
verygoodtrip/                          # Monorepo root
├── backend/                           # NestJS REST API
│   ├── src/
│   │   ├── auth/                      # JWT + OAuth strategies, guards, decorators
│   │   ├── charging-stations/         # IRVE station lookup service
│   │   ├── common/                    # Shared utilities (constants, transformers)
│   │   ├── config/                    # NestJS registerAs config factories
│   │   ├── database/
│   │   │   └── migrations/            # TypeORM migration files (manual SQL)
│   │   ├── favorites/                 # Saved routes CRUD
│   │   ├── fuel-prices/               # Real-time fuel price lookup
│   │   ├── health/                    # Health check endpoint
│   │   ├── i18n/
│   │   │   ├── fr/messages.json       # French translations
│   │   │   └── en/messages.json       # English translations
│   │   ├── mapbox/                    # Geocoding + Directions (global singleton)
│   │   ├── prices/                    # Default reference price endpoint
│   │   ├── scripts/                   # CLI scripts (ADEME import)
│   │   ├── seeds/                     # Vehicle catalog seed
│   │   ├── trips/                     # Route calculation, history, stats
│   │   ├── users/                     # User entity + repository
│   │   ├── vehicles/                  # Catalog (ADEME sync) + user garage CRUD
│   │   ├── app.module.ts              # Root NestJS module
│   │   └── main.ts                    # Bootstrap (entry point)
│   ├── test/                          # E2E test specs (jest-e2e.json config)
│   ├── docker-compose.yml             # PostgreSQL + pgAdmin + backend
│   ├── Dockerfile                     # Multi-stage Node.js Alpine build
│   └── package.json
│
├── web/                               # Next.js 15 App Router frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (fonts, Providers)
│   │   │   ├── page.tsx               # Landing page (public)
│   │   │   ├── login/page.tsx         # Login page
│   │   │   ├── register/page.tsx      # Register page
│   │   │   ├── auth/callback/
│   │   │   │   ├── google/page.tsx    # OAuth callback receiver
│   │   │   │   └── apple/page.tsx
│   │   │   ├── api/auth/
│   │   │   │   ├── set-cookie/route.ts  # BFF: set JWT cookie
│   │   │   │   └── logout/route.ts      # BFF: clear JWT cookie
│   │   │   └── app/                   # Authenticated section (/app/*)
│   │   │       ├── layout.tsx         # Server Component auth guard → AppLayout
│   │   │       ├── dashboard/page.tsx # KPIs, trip calculator, recent trips
│   │   │       ├── trips/
│   │   │       │   ├── page.tsx       # Trip history with filters
│   │   │       │   ├── [id]/page.tsx  # Trip detail + note editor
│   │   │       │   └── result/page.tsx  # Calculation result + save
│   │   │       ├── garage/
│   │   │       │   ├── page.tsx       # Vehicle list
│   │   │       │   ├── [id]/page.tsx  # Vehicle detail + edit
│   │   │       │   └── add/page.tsx   # Add vehicle (2-step flow)
│   │   │       ├── favorites/page.tsx # Saved routes
│   │   │       ├── fuel-prices/page.tsx  # Price config (localStorage)
│   │   │       ├── settings/page.tsx  # Theme + logout
│   │   │       └── vehicles/          # HTTP 308 redirect → /app/garage
│   │   ├── components/
│   │   │   ├── layouts/
│   │   │   │   └── AppLayout.tsx      # Sidebar (desktop) + topbar + drawer (mobile)
│   │   │   ├── ui/                    # Carbon Design System atomic components
│   │   │   │   ├── TWAppIcon.tsx      # App icon (rounded square + T lettermark)
│   │   │   │   ├── Wordmark.tsx       # Logotype (Space Grotesk)
│   │   │   │   ├── CTAButton.tsx      # Primary button (accent/ghost/danger)
│   │   │   │   ├── SectionCard.tsx    # Content card with title slot
│   │   │   │   ├── KPICell.tsx        # Metric cell (label + value + delta)
│   │   │   │   ├── Sparkline.tsx      # SVG mini chart
│   │   │   │   ├── FuelBadge.tsx      # Fuel type badge (colored)
│   │   │   │   ├── BrandAvatar.tsx    # Vehicle brand initials avatar
│   │   │   │   ├── Pill.tsx           # Status badge
│   │   │   │   ├── Eyebrow.tsx        # Section label (uppercase)
│   │   │   │   ├── Hairline.tsx       # Separator
│   │   │   │   ├── Input.tsx          # Form input with label/error
│   │   │   │   ├── Select.tsx         # Form select
│   │   │   │   ├── Modal.tsx          # Dialog overlay
│   │   │   │   ├── Card.tsx           # Generic card
│   │   │   │   ├── SegmentedControl.tsx  # Tab-style switcher
│   │   │   │   ├── StatusDot.tsx      # Connection/status indicator
│   │   │   │   └── NumberDisplay.tsx  # Formatted numeric display
│   │   │   ├── AutocompleteInput.tsx  # Geocode search with debounce
│   │   │   ├── MapboxMap.tsx          # mapbox-gl map (dynamic, ssr:false)
│   │   │   └── TripModal.tsx          # Quick trip calculator modal
│   │   ├── hooks/
│   │   │   └── useDebounce.ts         # Generic debounce hook
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios client + JWT interceptor + 401 redirect
│   │   │   └── auth.ts                # register(), login(), setAuthCookie(), logout()
│   │   ├── providers/
│   │   │   ├── Providers.tsx          # ThemeProvider + ToastProvider wrapper
│   │   │   └── ToastProvider.tsx      # Toast context (success/error/info, 4s)
│   │   └── types/
│   │       └── api.ts                 # Frontend TypeScript interfaces (mirrors backend shapes)
│   ├── messages/                      # (Unused in V1 — i18n deferred to V2)
│   │   ├── fr.json
│   │   └── en.json
│   ├── public/                        # Static assets (favicon, OG image, manifest)
│   └── next.config.ts                 # Vercel monorepo config + /app/vehicles redirect
│
├── mobile/                            # Expo SDK 54 / React Native app
│   ├── app/
│   │   ├── _layout.tsx                # Root layout (AuthProvider, StatusBar, Toast)
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx              # Email + Google OAuth
│   │   │   └── register.tsx           # Email registration
│   │   └── (tabs)/
│   │       ├── _layout.tsx            # Bottom tab bar (4 tabs)
│   │       ├── dashboard.tsx          # Trip calculator + map + results
│   │       ├── vehicles.tsx           # Vehicle CRUD
│   │       ├── favorites.tsx          # Saved routes
│   │       └── settings.tsx           # Theme + language + logout
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Axios client + SecureStore JWT interceptor
│   │   ├── auth/
│   │   │   └── storage.ts             # expo-secure-store wrappers (save/get/delete)
│   │   ├── components/
│   │   │   ├── AutocompleteInput.tsx  # Geocode search (FlatList dropdown)
│   │   │   ├── MapboxMap.tsx          # @rnmapbox/maps + Expo Go placeholder
│   │   │   └── ui/                    # Button, Card, Input, Wordmark
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Token state + useSegments routing gate
│   │   ├── hooks/
│   │   │   └── useDebounce.ts
│   │   ├── i18n/
│   │   │   ├── index.ts               # i18next init + expo-localization detection
│   │   │   └── translations/          # fr.ts + en.ts
│   │   └── types/
│   │       └── api.ts                 # Mobile-side TypeScript interfaces
│   ├── components/                    # Expo-generated components (outside src/)
│   ├── constants/
│   │   └── theme.ts                   # Palette, Colors, FontSizes, Spacing, Radius
│   ├── app.config.ts                  # Expo config (plugins, deep links, EAS)
│   └── eas.json                       # EAS build profiles (development/preview/production)
│
├── shared/                            # Pure TypeScript package — no build step
│   └── src/
│       ├── index.ts                   # Barrel re-export
│       ├── enums/index.ts             # FuelType, AuthProvider, ChargingMode, EnergyUnit
│       └── types/
│           ├── user.types.ts
│           ├── vehicle.types.ts
│           ├── trip.types.ts
│           ├── favorite.types.ts
│           └── fuel-category.types.ts
│
├── .planning/codebase/                # GSD codebase map documents
├── docker-compose.yml                 # Root-level compose (delegates to backend/)
├── package.json                       # Monorepo root scripts (concurrently)
├── vercel.json                        # Vercel monorepo config: build web/ only
└── CLAUDE.md                          # AI memory file (project context)
```

## Directory Purposes

**`backend/src/auth/`:**
- Purpose: All authentication concerns — no business logic
- Contains: `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, `strategies/` (local, JWT, Google, Apple), `guards/` (JwtAuthGuard, LocalAuthGuard, GoogleAuthGuard, AppleAuthGuard), `decorators/current-user.decorator.ts`, `dto/`
- Key files: `backend/src/auth/guards/jwt-auth.guard.ts`, `backend/src/auth/decorators/current-user.decorator.ts`

**`backend/src/common/`:**
- Purpose: Cross-cutting utilities with no module affiliation
- Contains: `calculation-constants.ts` (reference fuel/EV constants), `column-transformers.ts` (DECIMAL → number), `default-prices.ts` (fallback prices map), `fuel-type-categories.ts` (`toCategory()` helper)
- Key files: `backend/src/common/column-transformers.ts` — must be applied to every `type: 'decimal'` entity column

**`backend/src/database/migrations/`:**
- Purpose: Ordered TypeORM migration files — the only mechanism that alters the production schema
- Contains: Four migrations from initial schema to meta fields on trips
- Generated: No — migrations are hand-written SQL
- Committed: Yes

**`backend/src/mapbox/`:**
- Purpose: Single-source Mapbox client for the entire backend
- Contains: `mapbox.service.ts`, `mapbox.module.ts`
- Key: Declared `@Global()` — do not import `MapboxModule` in other modules; `MapboxService` is injectable everywhere

**`web/src/app/api/auth/`:**
- Purpose: BFF routes that run in the Node.js runtime (not Edge), handle cookie set/clear
- Key constraint: Never convert these to Edge Route Handlers — `cookies()` behavior differs

**`web/src/components/ui/`:**
- Purpose: Carbon Design System atomic components — the only component primitives that should be used in page files
- Contains: 19 components (see directory layout above)
- Convention: All accept className prop for extension; use `bg-carbon-*`, `text-carbon-*`, `border-carbon-*` Tailwind utilities

**`shared/src/`:**
- Purpose: Single source of truth for enums and interface shapes shared between backend and frontend
- Pattern: Backend references via path alias `@tripwise/shared` (configured in `backend/tsconfig.json`); web/mobile use direct relative import or workspace reference
- No build step — TypeScript source consumed directly

## Key File Locations

**Entry Points:**
- `backend/src/main.ts`: NestJS bootstrap, middleware, CORS, validation pipe
- `web/src/app/layout.tsx`: Next.js root layout (fonts, providers, metadata)
- `web/src/app/app/layout.tsx`: Authenticated section Server Component guard
- `mobile/app/_layout.tsx`: Expo Router root layout (AuthProvider, i18n init)

**Configuration:**
- `backend/src/config/database.config.ts`: TypeORM options (DATABASE_URL or individual vars, SSL, synchronize flag)
- `backend/src/config/app.config.ts`: JWT secret, port, other app settings
- `backend/src/database/data-source.ts`: TypeORM CLI data source (for `migration:generate`)
- `web/next.config.ts`: Vercel monorepo setup, `/app/vehicles` → `/app/garage` redirect
- `vercel.json`: Forces `@vercel/next` builder on `web/package.json` for monorepo deployment

**Core Logic:**
- `backend/src/trips/trips.service.ts`: Trip calculation (fuel cost, EV cost, multi-energy comparison, history, stats)
- `backend/src/fuel-prices/fuel-prices.service.ts`: Opendatasoft fuel price lookup + in-memory cache
- `backend/src/charging-stations/charging-stations.service.ts`: IRVE station lookup + in-memory cache
- `backend/src/mapbox/mapbox.service.ts`: Geocoding + Directions API wrapper
- `backend/src/vehicles/vehicle-sync.service.ts`: ADEME catalog sync on boot
- `web/src/lib/api.ts`: Axios client with JWT cookie injection and 401 redirect
- `web/src/lib/auth.ts`: `register()`, `login()`, `setAuthCookie()`, `logout()` helpers
- `mobile/src/context/AuthContext.tsx`: Token state machine + routing gate

**Testing:**
- `backend/test/`: E2E specs (`*e2e-spec.ts`) with SQLite in-memory DB, services mocked
- `backend/test/jest-e2e.json`: Jest config with `moduleNameMapper` for `@tripwise/shared`

## Naming Conventions

**Backend files:**
- Modules: `kebab-case/<module-name>/<module-name>.module.ts`
- Services: `<module-name>.service.ts`
- Controllers: `<module-name>.controller.ts`
- Entities: `<entity-name>.entity.ts` (kebab-case)
- DTOs: `<action>-<resource>.dto.ts` (e.g., `calculate-trip.dto.ts`)
- Strategies: `<provider>.strategy.ts`
- Guards: `<provider>-auth.guard.ts`

**Web files:**
- Page files: Next.js convention `page.tsx` under route segment directories
- Components: `PascalCase.tsx`
- Hooks: `use<Name>.ts`
- Lib utilities: `camelCase.ts`
- Types: `camelCase.ts` (e.g., `api.ts`)

**Mobile files:**
- Route files: lowercase (Expo Router convention — `login.tsx`, `dashboard.tsx`)
- Components: `PascalCase.tsx`
- Context: `PascalCase.tsx` (e.g., `AuthContext.tsx`)

**CSS classes (web):**
- Design tokens: `bg-carbon-*`, `text-carbon-*`, `border-carbon-*` (defined in `web/src/app/globals.css`)
- Avoid `bg-[var(--anything)]` — use Carbon Tailwind utility classes instead

## Where to Add New Code

**New Backend Feature (new domain):**
- Module: `backend/src/<feature-name>/<feature-name>.module.ts`
- Controller: `backend/src/<feature-name>/<feature-name>.controller.ts`
- Service: `backend/src/<feature-name>/<feature-name>.service.ts`
- Entity: `backend/src/<feature-name>/entities/<entity-name>.entity.ts`
- DTOs: `backend/src/<feature-name>/dto/<action>-<resource>.dto.ts`
- Migration: `backend/src/database/migrations/<timestamp>-<Description>.ts`
- Register in: `backend/src/app.module.ts` imports array
- E2E tests: `backend/test/<feature-name>.e2e-spec.ts`

**New Authenticated Web Page:**
- Page file: `web/src/app/app/<route-segment>/page.tsx`
- Must be a Client Component (`'use client'`) if it uses React state or API calls
- Use only Carbon Design System components from `web/src/components/ui/`
- API calls via `apiClient` from `web/src/lib/api.ts`
- Add to nav in `web/src/components/layouts/AppLayout.tsx` (NAV_ITEMS array)

**New Web UI Component:**
- Implementation: `web/src/components/ui/<ComponentName>.tsx`
- Use Carbon tokens (`bg-carbon-surface`, `border-carbon-hairline`, etc.) — never CSS variables with bracket notation

**New Shared Type:**
- Add to appropriate file in `shared/src/types/` or create a new `<domain>.types.ts`
- Re-export from `shared/src/index.ts`
- Duplicate type (as string literal union, not enum) in `web/src/types/api.ts` for web use

**New Mobile Screen:**
- Add tab: `mobile/app/(tabs)/<tab-name>.tsx`
- Add auth screen: `mobile/app/(auth)/<screen-name>.tsx`
- API calls via `mobile/src/api/client.ts`

**Utilities (backend):**
- Shared helpers with no module dependency: `backend/src/common/<utility-name>.ts`

## Special Directories

**`backend/src/database/migrations/`:**
- Purpose: Version-controlled SQL changes to the PostgreSQL schema
- Generated: Hand-written (do not use `migration:generate` in environments without a running DB)
- Committed: Yes — migrations are the deployment mechanism

**`backend/src/i18n/`:**
- Purpose: Translation JSON files for nestjs-i18n
- Committed: Yes
- Build: Copied to `dist/i18n/` by `nest-cli.json` assets config — do not reference with absolute paths

**`backend/src/seeds/`:**
- Purpose: One-time data seed scripts (vehicle catalog)
- Committed: Yes
- Run: `npx ts-node -r tsconfig-paths/register src/seeds/vehicle-models.seed.ts` (idempotent)

**`web/.next/`:**
- Generated: Yes (Next.js build output)
- Committed: No

**`backend/dist/`:**
- Generated: Yes (TypeScript compilation output)
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents consumed by plan-phase and execute-phase commands
- Committed: Yes

---

*Structure analysis: 2026-05-29*
