# Coding Conventions

**Analysis Date:** 2026-05-29

## TypeScript Configuration

All three packages (`backend/`, `web/`, `shared/`) enforce strict TypeScript:

```json
// backend/tsconfig.json — representative
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- **No implicit `any`** — enforced at compiler level (`noImplicitAny: true`)
- **Definite assignment assertions (`!`)** on TypeORM entity properties where TypeScript cannot infer initialisation:

```typescript
// backend/src/users/entities/user.entity.ts
@PrimaryGeneratedColumn('uuid')
id!: string;

@Column({ name: 'display_name', nullable: true, type: 'varchar' })
displayName!: string | null;
```

- **`unknown` for external errors** — use `instanceof Error` narrowing:

```typescript
// backend/src/lib/api.ts
(error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) { ... }
}
```

- **Type aliases over string literals** for union types:

```typescript
// backend/src/common/fuel-type-categories.ts
export type FuelCategory = 'gas' | 'diesel' | 'ev' | 'gpl';
```

## Naming Conventions

### Files and Directories

| Item | Pattern | Examples |
|------|---------|---------|
| NestJS modules/services/controllers | `kebab-case.role.ts` | `auth.service.ts`, `fuel-prices.controller.ts` |
| NestJS DTOs | `kebab-action-resource.dto.ts` | `add-user-vehicle.dto.ts`, `calculate-trip.dto.ts` |
| NestJS entities | `kebab-name.entity.ts` | `user-vehicle.entity.ts`, `trip.entity.ts` |
| Feature directories | `kebab-case/` | `auth/`, `fuel-prices/`, `charging-stations/` |
| React components (web) | `PascalCase.tsx` | `CTAButton.tsx`, `KPICell.tsx`, `SectionCard.tsx` |
| React hooks | `useKebab.ts` | `useDebounce.ts` |
| Next.js pages | `page.tsx` | `dashboard/page.tsx`, `login/page.tsx` |
| Next.js layouts | `layout.tsx` | `app/app/layout.tsx` |
| E2e test files | `kebab-name.e2e-spec.ts` | `auth.e2e-spec.ts`, `trips-crud.e2e-spec.ts` |
| Unit test files | `kebab-name.spec.ts` | `trips.service.spec.ts` |

### Code Identifiers

| Category | Pattern | Examples |
|----------|---------|---------|
| Variables / functions | `camelCase` | `findUserVehicles`, `buildAuthResponse`, `readUserPrices` |
| Booleans | `is*` / `has*` / `can*` prefix | `isMatch`, `isDefault`, `isArchived`, `isAllowedOrigin` |
| Classes / interfaces / types | `PascalCase` | `RegisterDto`, `TripResult`, `FuelCategory`, `VehicleStats` |
| Enums | `PascalCase` name, `SCREAMING_SNAKE_CASE` members | `FuelType.SP95_E10`, `AuthProvider.LOCAL`, `EnergyUnit.KWH` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `BCRYPT_SALT_ROUNDS`, `DEFAULT_GAS_CONSUMPTION`, `FALLBACK_PRICES` |
| Test stubs | `SCREAMING_SNAKE_CASE_STUB` | `DIRECTIONS_STUB`, `GEOCODE_STUB`, `FUEL_STATION_STUB` |
| React hooks | `use` prefix, `camelCase` | `useDebounce`, `useToast`, `useColorScheme` |

## Code Style

### Formatting

- **Prettier** configured in all packages (`prettier` in devDependencies)
- Backend: `"prettier/prettier": ["error", { endOfLine: "auto" }]` via `backend/eslint.config.mjs`
- Web: `npm run format` runs `prettier --write .`
- **End of line:** `auto` (cross-platform Windows/Unix)

### Linting (Backend)

Config: `backend/eslint.config.mjs`

```javascript
// Key rules
'@typescript-eslint/no-explicit-any': 'off',    // permitted in NestJS context
'@typescript-eslint/no-floating-promises': 'warn',
'@typescript-eslint/no-unsafe-argument': 'warn',
```

- Uses `typescript-eslint` with `recommendedTypeChecked` ruleset
- `prettier/recommended` enforces formatting as lint errors

### Linting (Web)

Config: `eslint-config-next` (Next.js built-in)

- `npm run lint` runs `next lint`
- No `console.log` found in `web/src/` — enforced by project convention
- ESLint `react-hooks/rules-of-hooks`: functions with `use*` prefix are treated as hooks — regular utility functions must NOT use `use*` prefix

## No `console.log` in Production Code

The backend uses `@nestjs/common`'s `Logger` class exclusively:

```typescript
// backend/src/mapbox/mapbox.service.ts
private readonly logger = new Logger(MapboxService.name);
this.logger.warn('MAPBOX_TOKEN non défini — les appels Mapbox échoueront');
```

- `console.log` appears ONLY in `backend/src/seeds/vehicle-models.seed.ts` and `backend/src/scripts/import-ademe.ts` (CLI scripts, not production runtime code)
- Web has zero `console.log` calls in `src/`

## Import Organization

### Backend (NestJS)

```typescript
// 1. NestJS framework
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// 2. Third-party libs
import { Repository, DataSource } from 'typeorm';
// 3. Local module services
import { MapboxService } from '../mapbox/mapbox.service';
import { VehiclesService } from '../vehicles/vehicles.service';
// 4. Entities
import { UserVehicle } from './entities/user-vehicle.entity';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';
// 5. DTOs
import { CalculateTripDto } from './dto/calculate-trip.dto';
// 6. Common utilities
import { toCategory } from '../common/fuel-type-categories';
```

### Web (Next.js)

```typescript
// 1. React / Next.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
// 2. Third-party UI libs
import { ArrowRight, MapPin } from 'lucide-react';
// 3. Internal UI components (via @/ alias)
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
// 4. Hooks / providers / lib
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
// 5. Types (always as `import type`)
import type { UserVehicle, TripStats } from '@/types/api';
```

**Path aliases:**
- `@/` → `web/src/` (in web only)
- `@verygoodtrip/shared` → `shared/src/index.ts` (backend and tests)

## DTO Validation Pattern

All backend input validation uses `class-validator` decorators on DTO classes.

```typescript
// backend/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, Matches, IsOptional, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  @Matches(/\d/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
```

**Rules:**
- Required fields: definite assignment (`!`) with no `@IsOptional()`
- Optional fields: `?` type with `@IsOptional()` first in decorator stack
- Nested objects: `@ValidateNested()` + `@Type(() => NestedClass)` from `class-transformer`
- UUID path params: `ParseUUIDPipe` in controller (`@Param('id', ParseUUIDPipe)`)
- Global `ValidationPipe` config: `{ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }`

## Error Handling

### Backend

Use NestJS built-in HTTP exceptions — never throw raw `Error`:

```typescript
// backend/src/vehicles/vehicles.service.ts
if (!model) throw new NotFoundException('Modèle de véhicule introuvable');
if (vehicle.userId !== userId) throw new ForbiddenException('Accès refusé');
if (existing) throw new ConflictException('Cet email est déjà utilisé');
```

**Exception mapping:**
| Condition | Exception class |
|-----------|----------------|
| Resource not found | `NotFoundException` |
| Ownership mismatch | `ForbiddenException` |
| Duplicate resource | `ConflictException` |
| Invalid input logic | `BadRequestException` |
| External service down | `ServiceUnavailableException` |
| Unexpected condition | `InternalServerErrorException` |

**i18n error messages:**
Use `I18nService.translate(key, { lang })` with `@Optional()` fallback in services so they work without the i18n module in tests:

```typescript
// backend/src/favorites/favorites.service.ts
constructor(
  @InjectRepository(Favorite) private readonly repo: Repository<Favorite>,
  @Optional() private readonly i18n: I18nService | null,
) {}

private async t(key: string, lang: string): Promise<string> {
  if (this.i18n) return this.i18n.translate(key, { lang }) as unknown as string;
  return key; // fallback: returns raw key in test environments
}
```

### Frontend (Web)

```typescript
// web/src/lib/api.ts — global Axios interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && ...) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

- Component error handling uses `try/catch` around `apiClient` calls
- Errors surfaced to user via `useToast()` (`showToast('error', message)`)

## Logging

**Backend only:** `@nestjs/common` `Logger` class — one instance per class:

```typescript
private readonly logger = new Logger(MapboxService.name);
// Usage
this.logger.log('...');
this.logger.warn('...');
this.logger.error('...');
```

**Web/Mobile:** No logging library — user feedback via toast notifications or React state.

## Immutability

State updates use spread patterns (never mutate in place):

```typescript
// web/src/providers/ToastProvider.tsx
setToasts((prev) => [...prev, { id, type, message }]);        // add
setToasts((prev) => prev.filter((t) => t.id !== id));         // remove
```

TypeORM `repo.save()` returns a new entity instance — the original DTO is never mutated.

## Module Structure (NestJS)

Each feature follows this layout:

```
backend/src/<feature>/
├── <feature>.module.ts        # NestJS module definition
├── <feature>.controller.ts    # Route handlers, auth guards
├── <feature>.service.ts       # Business logic
├── dto/
│   ├── create-<item>.dto.ts
│   ├── update-<item>.dto.ts
│   └── <action>-query.dto.ts  # Query param DTOs
└── entities/
    └── <item>.entity.ts       # TypeORM entity
```

Common utilities go in `backend/src/common/`:
- `backend/src/common/column-transformers.ts` — `decimalTransformer` for DECIMAL → number coercion
- `backend/src/common/calculation-constants.ts` — `DEFAULT_*` pricing constants
- `backend/src/common/fuel-type-categories.ts` — `FuelCategory` type + `toCategory()` function

## React Component Design (Web)

### Directive placement

Interactive components (hooks, state, events) MUST start with `'use client'`:
```typescript
// web/src/components/ui/CTAButton.tsx
'use client';
import React from 'react';
```

Server components (no state, no hooks) omit the directive:
```typescript
// web/src/components/ui/KPICell.tsx
// Server component
import React from 'react';
```

### Props interface pattern

```typescript
// Named export (no default exports on atoms)
type Variant = 'accent' | 'surface' | 'ghost' | 'danger';

interface CTAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function CTAButton({ variant = 'accent', loading = false, ...props }: CTAButtonProps) { ... }
```

### Variant maps

Define variant/size class maps as module-level `Record<Variant, string>` constants:

```typescript
const variantClasses: Record<Variant, string> = {
  accent: 'bg-carbon-accent text-white hover:brightness-110 ...',
  ghost:  'text-carbon-ink2 hover:text-carbon-ink ...',
};
```

## Carbon Design System (Web)

### CSS Custom Properties

Defined in `web/src/app/globals.css`:

| Token | CSS var | Tailwind class |
|-------|---------|----------------|
| Background | `--c-bg` | `bg-carbon-bg` |
| Surface | `--c-surface` | `bg-carbon-surface` |
| Elevated surface | `--c-surface2` | `bg-carbon-surface2` |
| Primary text | `--c-ink` | `text-carbon-ink` |
| Secondary text | `--c-ink2` | `text-carbon-ink2` |
| Muted text | `--c-muted` | `text-carbon-muted` |
| Faint fill | `--c-faint` | `bg-carbon-faint` |
| Separator | `--c-hairline` | `border-carbon-hairline` |
| Accent / link | `--c-accent` | `text-carbon-accent`, `bg-carbon-accent` |

**Theme switching:** Dark is the default (`:root`). Light mode: `[data-theme="light"]`. `next-themes` sets `data-theme` on `<html>`.

**Critical constraint:** Tailwind opacity modifiers (e.g., `bg-carbon-surface/50`) do NOT work with CSS variable colors. Use inline styles for opacity variants, or concrete Tailwind colors (e.g., `border-emerald-500/40`).

### Typography tokens

```css
font-family: var(--font-display)  /* Space Grotesk — headings and body */
font-family: var(--font-mono)     /* JetBrains Mono — numeric displays */
letter-spacing: -0.03em           /* .tracking-display — large headings */
letter-spacing: 0.14em            /* .tracking-eye — eyebrow labels */
```

### Eyebrow pattern

Labels above sections use uppercase + wide tracking + muted color:

```html
<span class="text-[10px] font-semibold tracking-eye-wide uppercase text-carbon-muted">
  Section Title
</span>
```

### Border radius

```css
rounded-card  /* 0.75rem — cards */
rounded-chip  /* 0.375rem — chips and nav items */
rounded-xl    /* dropdown items */
```

## Mobile Component Design (Expo)

- `StyleSheet.create()` for all styles — no NativeWind
- `useColorScheme()` for dark/light detection
- Colors from `mobile/constants/theme.ts` → `Colors[scheme]`
- Same component variant/size pattern as web (using `Record<Variant, ViewStyle>`)
- Named exports only (`export function Button(...)`)

## Comment Style

```typescript
// ── Section Header ────────────────────────────────────────────────
// Used consistently to delimit logical sections within a file

/** JSDoc for public interface members and service methods */
```

Section dividers use the `// ── Name ────` pattern with dashes to 80 chars, used throughout backend services, controllers, and test files.

---

*Convention analysis: 2026-05-29*
