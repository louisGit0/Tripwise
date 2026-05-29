# Technology Stack

**Analysis Date:** 2026-05-29

## Languages

**Primary:**
- TypeScript 5.x — all three sub-projects (backend, web, mobile) and shared types
  - Backend: `^5.7.3` (strict mode: `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`)
  - Web: `^5.8.3`
  - Mobile: `~5.9.2`

**Secondary:**
- SQL (PostgreSQL 16) — database schema and migrations

## Runtime

**Environment:**
- Node.js 20 LTS (pinned in `backend/Dockerfile`: `node:20-alpine`)
- Node.js native `fetch` used in backend services (no axios on the server side)

**Package Manager:**
- npm (individual lockfiles in each sub-project)
- Lockfiles: present in `backend/`, `web/`, `mobile/`
- Root `package.json` uses `concurrently ^9.1.2` for running sub-projects in parallel

## Frameworks

**Core:**
- **NestJS 11** (`@nestjs/common ^11.0.1`, `@nestjs/core ^11.0.1`) — REST API backend
  - Entry: `backend/src/main.ts`
  - Config: `backend/src/app.module.ts`
  - Modular architecture: auth, users, vehicles, trips, favorites, fuel-prices, charging-stations, prices, mapbox
- **Next.js 15.3.9** — web frontend (App Router, SSR + Server Components)
  - Entry: `web/src/app/layout.tsx`
  - Config: `web/next.config.ts`
  - Port: 3001 (dev)
- **Expo SDK 54** (`expo ~54.0.33`) + **React Native 0.81.5** — mobile app
  - Entry: `mobile/app.config.ts`, `mobile/eas.json`
  - Router: Expo Router 6 (file-based)
  - New Architecture enabled (`newArchEnabled: true`)

**UI — Web:**
- React 19.1.0
- Tailwind CSS 3.4.17 (`web/tailwind.config.ts`)
  - Custom Carbon design tokens via CSS variables (`--c-bg`, `--c-surface`, `--c-ink`, etc.)
  - Dark mode via `[data-theme="dark"]` selector
  - Custom fonts: Space Grotesk (display), JetBrains Mono (mono)
- next-themes `^0.4.6` — light/dark/system theme switching

**UI — Mobile:**
- React Native StyleSheet API (not NativeWind — incompatible with React 19 + new arch)
- `constants/theme.ts` — centralized palette, fonts, spacing

**Testing:**
- Jest 30 + ts-jest 29.2.5 — backend unit + e2e tests
  - Unit config: `backend/package.json` → `jest` key
  - E2E config: `backend/test/jest-e2e.json`
  - E2E uses better-sqlite3 (in-memory) to avoid Docker requirement
- No test framework detected in web or mobile (see TESTING.md)

**Build/Dev:**
- NestJS CLI `^11.0.0` — `nest build`, `nest start --watch`
- Webpack (via Next.js) — web build; `mapbox-gl` excluded from server bundle
- EAS Build (Expo Application Services) — mobile builds
  - Profiles: `development`, `preview` (iOS simulator), `production`
  - Config: `mobile/eas.json`

## Key Dependencies

**Critical — Backend:**
- `typeorm ^1.0.0` + `@nestjs/typeorm ^11.0.1` — ORM; entities in `backend/src/**/*.entity.ts`
- `pg ^8.21.0` — PostgreSQL driver
- `@nestjs/jwt ^11.0.2` + `passport-jwt ^4.0.1` — JWT auth (7-day tokens)
- `bcrypt ^6.0.0` — password hashing (salt rounds: 12)
- `passport-google-oauth20 ^2.0.0` — Google OAuth 2.0
- `passport-apple ^2.0.2` — Apple Sign In
- `@nestjs/throttler ^6.5.0` — rate limiting (100 req/min global, 5 req/min on auth routes)
- `nestjs-i18n ^10.8.4` — i18n (FR default, EN), JSON files in `backend/src/i18n/`
- `helmet ^8.1.0` — HTTP security headers
- `express-session ^1.19.0` — OAuth state store (5-min cookie, JWT-free sessions)

**Critical — Web:**
- `axios ^1.16.1` — API client (`web/src/lib/api.ts`); JWT read from cookie, injected as `Authorization: Bearer`
- `mapbox-gl ^3.24.0` — interactive route map (client-only, SSR excluded via `next.config.ts`)
- `react-hook-form ^7.76.0` + `@hookform/resolvers ^5.2.2` + `zod ^4.4.3` — form validation
- `lucide-react ^1.16.0` — icon set

**Critical — Mobile:**
- `@rnmapbox/maps ^10.3.1` — Mapbox map (dev build required; shows placeholder in Expo Go)
- `expo-secure-store ~15.0.8` — JWT storage (encrypted, outside JS sandbox)
- `expo-apple-authentication ~8.0.8` — Apple Sign In (iOS physical device in prod)
- `expo-web-browser ~15.0.11` — Google OAuth flow (`openAuthSessionAsync`)
- `i18next ^26.2.0` + `react-i18next ^17.0.8` + `expo-localization ~17.0.8` — i18n FR/EN
- `react-native-reanimated ~4.1.1` + `react-native-gesture-handler ~2.28.0` — animations
- `react-native-toast-message ^2.3.3` — toast notifications

**Infrastructure:**
- `concurrently ^9.1.2` (root) — parallel dev script
- `@verygoodtrip/shared` — internal shared package at `shared/src/index.ts`; referenced via path alias `@verygoodtrip/shared` in `backend/tsconfig.json`; no build step

## Configuration

**Environment:**
- Backend: `backend/.env` (loaded by `@nestjs/config`, `dotenv ^17.4.2`)
  - Key vars: `NODE_ENV`, `PORT`, `DATABASE_URL` / `DB_*`, `JWT_SECRET`, `MAPBOX_TOKEN`, `GOOGLE_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY`, `CORS_ORIGINS`, `FRONTEND_URL`
  - Template: `backend/.env.example`
- Web: `web/.env.local`
  - Key vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`
  - Template: `web/.env.example`
- Mobile: `mobile/.env`
  - Key vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_DOWNLOAD_TOKEN` (build-time secret, EAS only), `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
  - Template: `mobile/.env.example`

**Build:**
- `backend/tsconfig.json` — target ES2023, module nodenext, strict, `emitDecoratorMetadata: true`
- `web/next.config.ts` — `mapbox-gl` excluded from server bundle; `/app/vehicles` → `/app/garage` HTTP 308 redirect
- `web/tailwind.config.ts` — Carbon token colors, custom font families, border radius tokens
- `mobile/app.config.ts` — Expo config (plugins, schemes, EAS extras)
- `mobile/eas.json` — EAS build profiles

## Platform Requirements

**Development:**
- Node.js 20+
- Docker + Docker Compose (for local PostgreSQL 16 + pgAdmin)
  - Services: `backend/Dockerfile` (multi-stage, Node 20 Alpine), `docker-compose.yml`
- Mapbox account + token (`MAPBOX_TOKEN`)
- Expo Go (mobile preview without map) or EAS dev build (with map)

**Production:**
- Backend: Render (or similar; `trust proxy 1` set for single NGINX hop)
  - Docker: `node:20-alpine`, `node dist/main`
- Database: Supabase / Neon / Render Postgres (`DATABASE_URL` with SSL)
- Frontend Web: Vercel (Next.js); configured via `vercel.json` (monorepo root) or Vercel dashboard
  - Auto-allowed: `verygoodtrip*.vercel.app` (regex in `backend/src/main.ts`)
- Mobile: Expo EAS Build → App Store / Google Play

---

*Stack analysis: 2026-05-29*
