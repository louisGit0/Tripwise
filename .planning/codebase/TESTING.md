# Testing Patterns

**Analysis Date:** 2026-05-29

## Test Framework

### Backend

**Runner:** Jest 30 with `ts-jest`
- Unit test config: `backend/package.json` (`"jest"` section)
- E2e test config: `backend/test/jest-e2e.json`
- HTTP testing: `supertest` 7

**Assertion Library:** Jest built-in (`expect`)

**Run Commands:**
```bash
cd backend

npm test                    # Unit tests (*.spec.ts in src/)
npm run test:watch          # Unit tests in watch mode
npm run test:cov            # Unit tests with coverage report
npm run test:e2e            # All e2e suites (test/*.e2e-spec.ts)

# Run a specific e2e suite
npx jest --config test/jest-e2e.json --testPathPatterns="auth" --forceExit
npx jest --config test/jest-e2e.json --testPathPatterns="trips-crud" --forceExit
```

### Web

No Jest or browser tests. The quality gate is TypeScript + build:

```bash
cd web

npm run type-check          # tsc --noEmit  (0 errors required)
npm run build               # next build    (all routes must compile)
npm run lint                # next lint     (0 ESLint errors)
```

### Mobile

No tests configured. Same type-check gate applies:

```bash
cd mobile
npx tsc --noEmit
```

## Test File Organization

### Backend Unit Tests

**Location:** Co-located with source files in `backend/src/`

**Naming:** `<module>.service.spec.ts`

**Current unit tests:**
- `backend/src/trips/trips.service.spec.ts` — 19 tests covering fuel and electric cost calculations

### Backend E2e Tests

**Location:** `backend/test/`

**Naming:** `<feature>.e2e-spec.ts` or `<feature>-crud.e2e-spec.ts`

**Current e2e suites (9 files, 136 total tests):**
| File | Tests | Covers |
|------|-------|--------|
| `backend/test/app.e2e-spec.ts` | 1 | Health check |
| `backend/test/auth.e2e-spec.ts` | 11 | Register, login, JWT, validation |
| `backend/test/vehicles.e2e-spec.ts` | 20 | Catalog, CRUD, 403/404, EV validation |
| `backend/test/trips.e2e-spec.ts` | 30 | Calculate (fuel + electric), geocode |
| `backend/test/trips-crud.e2e-spec.ts` | 25 | Save, history, stats, GET/:id, PATCH, DELETE |
| `backend/test/favorites.e2e-spec.ts` | 19 | CRUD, 403 ownership check |
| `backend/test/fuel-prices.e2e-spec.ts` | 7 | Nearest station price lookup |
| `backend/test/charging-stations.e2e-spec.ts` | 10 | Nearby + along-route queries |
| `backend/test/prices.e2e-spec.ts` | 3 | Default prices endpoint |

**Jest e2e config (`backend/test/jest-e2e.json`):**
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@verygoodtrip/shared$": "<rootDir>/../shared/src/index.ts",
    "^@verygoodtrip/shared/(.*)$": "<rootDir>/../shared/src/$1"
  }
}
```

## E2e Test Structure

Each e2e spec follows this exact scaffold:

```typescript
// backend/test/auth.e2e-spec.ts
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ app: { ... } })] }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',       // No PostgreSQL required
          entities: [User, UserVehicle, VehicleModel, Favorite, Trip],
          synchronize: true,          // Auto-create schema from entities
          logging: false,
        }),
        AuthModule,
        UsersModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)   // OAuth stub
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)     // OAuth stub
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  describe('POST /api/v1/auth/register', () => {
    it('crée un compte et retourne un JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'alice@example.com', password: 'Secret12' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({ email: 'alice@example.com', provider: 'local' });
    });

    it('rejette un email déjà utilisé (409)', async () => { ... });
  });
});
```

**Key rules:**
- One `beforeAll` / `afterAll` pair per file
- `app.setGlobalPrefix('api/v1')` and `ValidationPipe` re-applied in every fixture
- `better-sqlite3` + `synchronize: true` replaces PostgreSQL — no migration required

## SQLite In-Memory Database

All e2e tests use `better-sqlite3` instead of PostgreSQL:

```typescript
TypeOrmModule.forRoot({
  type: 'better-sqlite3',
  database: ':memory:',    // Fresh DB per test suite
  entities: [User, UserVehicle, VehicleModel, Favorite, Trip],
  synchronize: true,       // Schema created from entity decorators
  logging: false,
})
```

**Important:** Every e2e spec must include ALL entities in the `entities` array, even if the suite doesn't test them. Missing entities cause TypeORM foreign key errors.

## Mocking Patterns

### OAuth Strategy Stubs

Every e2e spec file stubs out OAuth strategies using the same pattern:

```typescript
// Extend a local Strategy so the mock is valid for Passport's registry
class GoogleStrategyMock extends PassportStrategy(Strategy, 'google') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }    // Effectively disables Google OAuth
}

class AppleStrategyMock extends PassportStrategy(Strategy, 'apple') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

// Applied in moduleFixture setup:
.overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
.overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
```

### External Service Mocks (E2e)

Services that make HTTP calls (Mapbox, FuelPrices, ChargingStations) are mocked with `jest.fn().mockResolvedValue(stub)`:

```typescript
// backend/test/trips.e2e-spec.ts
const mapboxMock = {
  geocode: jest.fn().mockResolvedValue(GEOCODE_STUB),
  getDirections: jest.fn().mockResolvedValue(DIRECTIONS_STUB),
};

const fuelPricesMock = {
  findNearestStationPrice: jest.fn().mockResolvedValue(ORIGIN_STATION),
  averagePriceBetweenPoints: jest.fn().mockResolvedValue({ price: 1.75, ... }),
};

// Applied via .overrideProvider:
.overrideProvider(MapboxService).useValue(mapboxMock)
.overrideProvider(FuelPricesService).useValue(fuelPricesMock)
.overrideProvider(ChargingStationsService).useValue(chargingStationsMock)
```

### Service Unit Test Mocks

```typescript
// backend/src/trips/trips.service.spec.ts
let vehiclesService: jest.Mocked<VehiclesService>;

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TripsService,
      {
        provide: VehiclesService,
        useValue: { findUserVehicles: jest.fn() },
      },
      {
        provide: MapboxService,
        useValue: { getDirections: jest.fn().mockResolvedValue(DIRECTIONS_STUB) },
      },
    ],
  }).compile();

  service = module.get(TripsService);
  vehiclesService = module.get(VehiclesService) as jest.Mocked<VehiclesService>;
});
```

**Per-test mock control:**
```typescript
vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.SP95 })] as any);
```

## Stub Data

Stub constants use `SCREAMING_SNAKE_CASE` and are defined at module scope above the `describe` block:

```typescript
const DIRECTIONS_STUB = {
  distanceMeters: 450_000,
  durationSeconds: 14_400,
  geometry: {
    type: 'LineString' as const,
    coordinates: [[2.3522, 48.8566], [5.3698, 43.2965]] as [number, number][],
  },
  waypoints: [
    { name: 'Paris',     location: [2.3522, 48.8566] as [number, number] },
    { name: 'Marseille', location: [5.3698, 43.2965] as [number, number] },
  ],
};
```

**Factory functions** for variable entity shapes:
```typescript
// backend/src/trips/trips.service.spec.ts
const makeVehicle = (overrides: Partial<{ fuelType: FuelType; consumption: number }> = {}) => ({
  id: 'uv-1',
  vehicleModel: {
    fuelType: overrides.fuelType ?? FuelType.SP95,
    consumption: overrides.consumption ?? 6.5,
  },
});
```

## Authentication in E2e Tests

All e2e suites use a `registerAndLogin` helper that returns a JWT `accessToken`:

```typescript
async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}
```

Protected endpoints are called with `Bearer` token:

```typescript
const token = await registerAndLogin(app, 'user@test.com');

await request(app.getHttpServer())
  .get('/api/v1/favorites')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

## Test Naming Convention

- Written in **French**: `'crée un compte et retourne un JWT'`
- Error cases include HTTP status: `'rejette un email déjà utilisé (409)'`
- Section comments inside `describe` blocks: `// ── Register ────────────────────────`

## Common Assertions

```typescript
// Response shape
expect(res.body).toHaveProperty('accessToken');
expect(res.body).toMatchObject({ email: 'x@y.com', provider: 'local' });

// Security — never expose hash
expect(res.body).not.toHaveProperty('passwordHash');

// Floating-point calculations
expect(cost.consumptionLitres).toBeCloseTo(29.25, 1);
expect(cost.totalCost).toBeCloseTo(51.19, 1);

// Error propagation
await expect(service.calculate('user-1', dto)).rejects.toThrow(NotFoundException);

// Numeric type assertions
expect(typeof res.body.gas).toBe('number');
expect(res.body.gas).toBeGreaterThan(0);
expect(res.body.fastShare).toBeLessThanOrEqual(1);
```

## Coverage

**Requirements:** No enforced threshold in Jest config (no `coverageThreshold` set).

**Collection:** Unit test coverage collects from all `**/*.(t|j)s` files under `backend/src/`.

**View coverage:**
```bash
cd backend && npm run test:cov
# Report written to backend/coverage/
```

**Current state:**
- 1 unit test file: `backend/src/trips/trips.service.spec.ts` (19 tests — cost calculation logic)
- 9 e2e suites: 136 tests total — covers all module endpoints
- Web: 0 automated tests — gated by `tsc --noEmit` + `next build`
- Mobile: 0 automated tests

## What Is and Is NOT Mocked

**Always mocked in e2e:**
- `MapboxService` — prevents real HTTP calls to Mapbox API
- `FuelPricesService` / `ChargingStationsService` — prevents real HTTP calls to external APIs
- `GoogleStrategy` / `AppleStrategy` — prevents OAuth redirects

**Never mocked in e2e:**
- Database operations (real `better-sqlite3` in-memory)
- `AuthService` / `UsersService` — real JWT signing + bcrypt hashing
- `ValidationPipe` — real validation against DTOs
- `JwtAuthGuard` — real JWT verification

**Unit test boundary (`trips.service.spec.ts`):**
All NestJS module dependencies are mocked; only the pure calculation logic of `TripsService` is exercised.

## Config Injection in Tests

Tests use a hardcoded config factory to avoid `.env` files:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: true,                     // never reads .env
  load: [
    () => ({
      app: {
        jwtSecret: 'test-jwt-secret-at-least-32-chars-long',
        nodeEnv: 'test',
        port: 3001,
        apiPrefix: 'api/v1',
        corsOrigins: ['http://localhost:3001'],
        mapboxToken: '',
      },
    }),
  ],
}),
```

Each suite uses a different `port` value to avoid conflicts if suites are ever run in parallel.

---

*Testing analysis: 2026-05-29*
