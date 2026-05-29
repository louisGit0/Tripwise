# Phase 1: Precise Tolls End-to-End (Web) - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 11 (3 new, 8 modified)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | New/Mod | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|---------|------|-----------|----------------|---------------|
| `backend/src/toll/toll.service.ts` | NEW | service | request-response (cached external API) | `backend/src/fuel-prices/fuel-prices.service.ts` | exact |
| `backend/src/toll/toll.module.ts` | NEW | module/config | DI wiring | `backend/src/fuel-prices/fuel-prices.module.ts` | exact |
| `backend/src/toll/toll.service.spec.ts` | NEW | test | unit (mock fetch) | `backend/src/trips/trips.service.spec.ts` | exact |
| `backend/src/trips/trips.service.ts` | MOD | service | request-response | (self — remove `computeTollCost`/`estimateFrenchTolls`, inject `TollService`) | self |
| `backend/src/trips/trips.module.ts` | MOD | module/config | DI wiring | `backend/src/fuel-prices/fuel-prices.module.ts` (import pattern) | exact |
| `backend/src/trips/entities/trip.entity.ts` | MOD | model | persistence | (self — `isArchived` boolean column already present, mirror it) | self |
| `backend/src/database/migrations/<ts>-AddTollIsEstimateToTrips.ts` | NEW | migration | schema change | `backend/src/database/migrations/1747701000000-AddTripMetaFields.ts` | exact |
| `backend/src/trips/dto/save-trip.dto.ts` | MOD | dto/validation | request-response | (self — mirror optional `tollsCost` field) | self |
| `web/src/app/app/trips/result/page.tsx` | MOD | component | request-response (render) | (self — existing PÉAGES metric cell) | self |
| `web/src/app/app/trips/[id]/page.tsx` | MOD | component | request-response (render) | (self — existing `trip.tollsCost > 0` block) | self |
| `web/src/types/api.ts` | MOD | model/type | type contract | (self — `TripResult.tollIsEstimate` already exists; add to `SavedTrip`) | self |
| `web/src/components/ui/Tooltip.tsx` | NEW | component (UI atom) | presentation | `web/src/components/ui/Pill.tsx` / `web/src/components/ui/FuelBadge.tsx` | role-match |

---

## Pattern Assignments

### `backend/src/toll/toll.service.ts` (service, cached external API) — NEW

**Analog:** `backend/src/fuel-prices/fuel-prices.service.ts`

This is the single most important analog. The toll service must reproduce the fuel-prices service's exact structure: a `Logger`, a private `Map` cache with TTL, a `try`/fetch/`catch`→fallback path, and `AbortSignal.timeout(8000)`. The only differences: 30-day TTL (vs 1h), a polyline-hash cache key (vs `lat:lng:fuelType`), and the heuristic (moved verbatim from `trips.service.ts`) as the fallback instead of `FALLBACK_PRICES`.

**Cache + Logger declaration** (`fuel-prices.service.ts` lines 64-69):
```typescript
@Injectable()
export class FuelPricesService {
  private readonly logger = new Logger(FuelPricesService.name);
  // Cache keyed by "lat:lng:fuelType"
  private readonly cache = new Map<string, CacheEntry>();
```
For toll: inject `ConfigService` (the existing `computeTollCost` already reads `this.config.get<string>('TOLLGURU_API_KEY')` — see below).

**CacheEntry type + TTL constant** (`fuel-prices.service.ts` lines 15-22):
```typescript
interface CacheEntry {
  data: StationPrice[];
  expiresAt: number;
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
```
For toll, mirror exactly but: `data: { cost: number; isEstimate: boolean }` and `const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days` (D-06).

**Cache check + write + silent fallback** (`fuel-prices.service.ts` lines 107-122) — copy this structure literally:
```typescript
const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${fuelType}:${count}`;
const cached = this.cache.get(cacheKey);
if (cached && Date.now() < cached.expiresAt) {
  return cached.data;
}
try {
  const results = await this.callApi(lat, lng, fuelType, count);
  this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
  return results;
} catch (err) {
  this.logger.warn(`API ... indisponible, utilisation du prix de repli: ${err}`);
  const fallback = this.buildFallback(lat, lng, fuelType);
  return [fallback];
}
```
For toll, the cache key uses a SHA-1 polyline hash (D-06 / research line 269): `` `toll:class1:${createHash('sha1').update(polyline).digest('hex')}` `` with `import { createHash } from 'node:crypto'`.

**fetch + timeout + non-ok handling** (`fuel-prices.service.ts` lines 144-160) — the project HTTP idiom (native `fetch`, no axios):
```typescript
const resp = await fetch(url, {
  signal: AbortSignal.timeout(8000),
  headers: { Accept: 'application/json' },
});
if (!resp.ok) {
  throw new Error(`HTTP ${resp.status} depuis l'API ...`);
}
const json = (await resp.json()) as { results: ...; total_count: number };
```

**TollGuru branch to MOVE + HARDEN** (current `trips.service.ts` lines 647-691) — move into `TollService`, then apply the two D-05/Pitfall fixes:
```typescript
const apiKey = this.config.get<string>('TOLLGURU_API_KEY');
if (apiKey) {
  try {
    const response = await fetch(
      'https://apis.tollguru.com/toll/v2/origin-destination-waypoints', // ← CHANGE: complete-polyline-from-mapping-service (D-05)
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          vehicle: { type: '2AxlesAuto' },               // keep (TOLL-03)
          origin: {...}, destination: {...},             // ← CHANGE: send { source:'mapbox', polyline } (D-05)
          currency: 'EUR',
        }),
        signal: AbortSignal.timeout(8000),               // keep
      },
    );
    if (response.ok) {
      const data = await response.json() as { summary?: { costs?: {...} } };
      const cost = data.summary?.costs?.cash ?? ...;     // ← CHANGE: defensive parse route.costs.{tag,cash,minimumTollCost} (Pitfall 3)
      if (cost !== null) return { cost: round2(cost), isEstimate: false };
    }
  } catch { /* fall through to heuristic */ }            // keep (D-03 silent degradation)
}
```

**Heuristic to MOVE verbatim** (current `trips.service.ts` lines 699-717) — `estimateFrenchTolls(distanceKm, durationSeconds)` becomes a private method of `TollService` unchanged. It is the fallback, not the product (research line 188).

**Public contract to preserve exactly** (so `TripsService` injection is drop-in):
```typescript
computeTollCost(...): Promise<{ cost: number; isEstimate: boolean } | null>
```

> Note: `round2` is a module-level helper already used in `trips.service.ts` — move/duplicate it into the toll module.

---

### `backend/src/toll/toll.module.ts` (module) — NEW

**Analog:** `backend/src/fuel-prices/fuel-prices.module.ts` (full file, lines 1-10):
```typescript
import { Module } from '@nestjs/common';
import { FuelPricesController } from './fuel-prices.controller';
import { FuelPricesService } from './fuel-prices.service';

@Module({
  controllers: [FuelPricesController],
  providers: [FuelPricesService],
  exports: [FuelPricesService],
})
export class FuelPricesModule {}
```
Toll has **no controller** (it is only consumed by `TripsService`). So: `providers: [TollService]`, `exports: [TollService]`, no `controllers`. `TollService` reads `ConfigService`, which is global (`ConfigModule` is global per AppModule) — no extra import needed.

---

### `backend/src/trips/trips.module.ts` (module) — MOD

**Analog:** self — mirror how `FuelPricesModule` is already imported (lines 8, 15):
```typescript
import { FuelPricesModule } from '../fuel-prices/fuel-prices.module';
// ...
imports: [
  TypeOrmModule.forFeature([Trip, UserVehicle]),
  VehiclesModule,
  FuelPricesModule,        // ← add `TollModule` the same way
  ChargingStationsModule,
],
```
Add `import { TollModule } from '../toll/toll.module';` and place `TollModule` in the `imports` array.

---

### `backend/src/trips/trips.service.ts` (service) — MOD

**Analog:** self.

1. **Delete** `computeTollCost` (lines 647-691) and `estimateFrenchTolls` (lines 699-717) — moved to `TollService`.
2. **Inject** `TollService` in the constructor (alongside the existing `MapboxService`, `FuelPricesService`, `ConfigService`, repositories).
3. **Update the call site** (lines 196-202) — keep it inside the existing `Promise.all`; only the receiver changes:
```typescript
const [cost, tollResult] = await Promise.all([
  fuelType === FuelType.ELECTRIC ? this.computeElectricCost(...) : this.computeFuelCost(...),
  this.toll.computeTollCost(/* polyline (D-05), distanceKm, directions.durationSeconds */),
]);
```
The polyline source is `directions.geometry` (GeoJSON LineString from `MapboxService.getDirections`, already computed at line 188 — see Shared Patterns). The result mapping at lines 221-222 stays identical:
```typescript
tollCost:      tollResult?.cost ?? null,
tollIsEstimate: tollResult?.isEstimate ?? false,
```
4. **saveTrip** (lines 247-271): add `tollIsEstimate: dto.tollIsEstimate ?? false` to the `tripRepo.create({...})` object, next to the existing `tollsCost: dto.tollsCost ?? 0` (line 264). Mirror the exact `?? false`/`?? 0` defaulting style already used there.

---

### `backend/src/trips/entities/trip.entity.ts` (model) — MOD

**Analog:** self — the existing `isArchived` boolean column (lines 112-114) is the exact template for the new `tollIsEstimate` column:
```typescript
/** Trajet archivé (masqué de l'historique actif, conservé pour les stats) */
@Column({ name: 'is_archived', type: 'boolean', default: false })
isArchived!: boolean;
```
Add next to `tollsCost` (lines 124-129):
```typescript
/** true si tollsCost est une estimation heuristique (pas TollGuru) */
@Column({ name: 'toll_is_estimate', type: 'boolean', default: false })
tollIsEstimate!: boolean;
```
Also **update the stale comment** on `tollsCost` (lines 124-127, currently "V1 = 0 (non calculé)") — now false (Pitfall 8).

---

### `backend/src/database/migrations/<timestamp>-AddTollIsEstimateToTrips.ts` (migration) — NEW

**Analog:** `backend/src/database/migrations/1747701000000-AddTripMetaFields.ts` (full file). It is the exact precedent: a hand-written boolean/numeric `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` with a matching `down`. Hand-write it (project convention — `migration:generate` is unreliable here; a plain boolean column avoids the `simple-enum` issue — research lines 196-202).

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripMetaFields1747701000000 implements MigrationInterface {
  name = 'AddTripMetaFields1747701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN IF NOT EXISTS "tolls_cost" NUMERIC(8,2) NOT NULL DEFAULT 0
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "tolls_cost"`);
  }
}
```
For the new migration: class `AddTollIsEstimateToTrips<timestamp>` (timestamp > `1747701000000`), `up` adds `"toll_is_estimate" BOOLEAN NOT NULL DEFAULT false` with `IF NOT EXISTS`, `down` drops it. No data migration needed (default `false` = "unknown→estimate", research line 196).

---

### `backend/src/trips/dto/save-trip.dto.ts` (dto) — MOD

**Analog:** self — mirror the existing optional `tollsCost` field (lines 61-65):
```typescript
/** Frais de péage — toujours 0 en V1 */   // ← stale comment, update (Pitfall 8)
@IsOptional()
@IsNumber()
@Min(0)
tollsCost?: number;
```
Add a boolean sibling using class-validator (import `IsBoolean`):
```typescript
@IsOptional()
@IsBoolean()
tollIsEstimate?: boolean;
```

---

### `backend/src/toll/toll.service.spec.ts` (test) — NEW

**Analog:** `backend/src/trips/trips.service.spec.ts` (existing unit spec — 19 tests covering `computeFuelCost`/`computeElectricCost`/`formatDuration` with mocked deps). Mirror its `describe`/`it` structure and AAA layout. Move the heuristic test cases (speed-bands, ratio, rounding, fallback) out of `trips.service.spec.ts` into here. Mock global `fetch` for the TollGuru cases (precise success → `isEstimate:false`; non-ok/timeout/parse-fail → heuristic `isEstimate:true`; `hasTolls:false` → `cost:0,isEstimate:false`; cache-hit → assert fetch called once). See research Test Map (lines 359-367) for the exact cases.

---

### `web/src/app/app/trips/result/page.tsx` (component) — MOD

**Analog:** self — the existing PÉAGES metric cell (lines 188-194) and the metrics array `.map()` (lines 181-221).

**Current PÉAGES cell to replace** (lines 188-194):
```tsx
{
  label: 'PÉAGES',
  value: result.tollCost !== null
    ? `${tollIsEstimate ? '~' : ''}${fmtEur.format(result.tollCost)}`
    : 'Non calculé',
  note: tollIsEstimate && result.tollCost !== null ? 'estimation' : undefined,
},
```

**Required changes:**
- **D-04 hide-when-0 / Pitfall 6:** convert the inline array literal (line 181) into a `const metrics = [...].filter(Boolean)` so the péage entry is conditionally `false` when `result.tollCost == null || result.tollCost === 0`, and the `grid grid-cols-2` (line 180) reflows. Existing helpers already in scope: `const tollIsEstimate = result.tollIsEstimate ?? false` (line 137), `const tollCost = result.tollCost ?? 0` (line 135), `fmtEur` formatter.
- **D-01/D-02 badge + tooltip:** replace the `~` prefix and the amber `note` with a `<Pill>` (color `success` for "réel", `warning` for "≈ estimé") wrapped in the new `<Tooltip>`. Reuse the existing cell render scaffold (lines 206-221) which already supports an optional `note` slot — extend it to render a badge node.

Badge wording (D-01, FR): `réel` / `≈ estimé`. Tooltip copy (research lines 285-287): estimate → "Estimation indicative (calcul français moyen)"; real → "Prix réel calculé par TollGuru le long de l'itinéraire".

> Note: `totalCost` already sums the toll (line 136 `(cost?.totalCost ?? 0) + tollCost`) and the save payload already sends `tollsCost` (line 108). Add `tollIsEstimate: result.tollIsEstimate` to the save payload object (near line 108) so it persists.

---

### `web/src/app/app/trips/[id]/page.tsx` (component) — MOD

**Analog:** self — the existing péages block (lines 264-273), already gated on `trip.tollsCost > 0` (which satisfies D-04 here):
```tsx
{trip.tollsCost > 0 && (
  <div className="flex items-center justify-between mt-3 pt-3 border-t border-carbon-hairline">
    <span className="text-xs text-carbon-muted uppercase tracking-widest font-semibold">Péages</span>
    <span className="text-sm font-mono font-bold text-carbon-ink tabular-nums">
      {fmtEur.format(trip.tollsCost)}
    </span>
  </div>
)}
```
Add the same `<Pill>`+`<Tooltip>` badge next to the amount, driven by the newly-persisted `trip.tollIsEstimate` (Pitfall 7 / TOLL-05). Same wording/colors as the result page for consistency.

---

### `web/src/types/api.ts` (type) — MOD

**Analog:** self. `TripResult.tollIsEstimate` already exists (lines 122-124):
```typescript
tollCost: number | null;
/** true si le coût de péage est une estimation heuristique (pas TollGuru) */
tollIsEstimate: boolean;
```
Mirror this onto the `SavedTrip` interface — it currently has only `tollsCost: number;` (line 182). Add `tollIsEstimate: boolean;` right after it.

---

### `web/src/components/ui/Tooltip.tsx` (UI atom) — NEW

**Analog:** `web/src/components/ui/Pill.tsx` (lines 1-52) for the props/className/Carbon-token conventions, and `web/src/components/ui/FuelBadge.tsx` (lines 35-43) for a minimal one-element atom.

No tooltip primitive exists yet (verified — see No-Analog section). Build a lightweight one mirroring the Pill conventions:
- Named export `function Tooltip({ children, content, ... }: TooltipProps)` (Pill uses a named, not default, export — line 37).
- Carbon tokens for surface/text/border: `bg-carbon-surface2`, `text-carbon-ink2`, `border-carbon-hairline` (Pill lines 14-21).
- D-02 requires **hover (desktop) AND tap (touch)** — implement with a focusable wrapper (`tabIndex`, group-hover + group-focus-within) so it works without JS where possible; this is a small client component (`'use client'`) since Pill/FuelBadge are server components but a tap-toggle needs interactivity.
- Keep it ~30-50 lines, single responsibility (project rule: many small files).

---

## Shared Patterns

### Route polyline source (D-05)
**Source:** `backend/src/mapbox/mapbox.service.ts` — `getDirections` (line 99) returns `{ distanceMeters, durationSeconds, geometry: { type:'LineString', coordinates:[lng,lat][] }, waypoints }`. It currently requests `geometries: 'geojson'` (line 109).
**Apply to:** `TollService.computeTollCost`. Two options (research Pitfall 2): (a) encode `geometry.coordinates` to a Google polyline in `TollService` via the inline ~30-LOC encoder (research lines 248-262); or **recommended** (b) change the Mapbox call to `geometries: 'polyline6'` and pass that string with `source:'mapbox'`. The geometry is already computed once at `trips.service.ts` line 188 — pass it into the toll call, do not re-fetch.

### External-API service idiom (HTTP + cache + silent fallback)
**Source:** `backend/src/fuel-prices/fuel-prices.service.ts` (and `charging-stations.service.ts`).
**Apply to:** `backend/src/toll/toll.service.ts`. Native `fetch` + `AbortSignal.timeout(8000)`, in-memory `Map<string, CacheEntry>` with `expiresAt`, `this.logger.warn` on failure, never throw to caller (D-03).

### Server-side secret access (TOLL-06)
**Source:** existing `this.config.get<string>('TOLLGURU_API_KEY')` in `trips.service.ts` (line 653); `@nestjs/config` `ConfigService` is global.
**Apply to:** `TollService` — read the key server-side only; only `{ cost, isEstimate }` (→ `tollCost`/`tollIsEstimate`) ever leaves the server. Never serialize the key into any response (assert in e2e).

### DECIMAL → number persistence
**Source:** `backend/src/common/column-transformers.ts` `decimalTransformer`, applied to `tollsCost` (`trip.entity.ts` line 128).
**Apply to:** unchanged — `tollsCost` already uses it. The new `tollIsEstimate` is a plain `boolean` (no transformer).

### Carbon design-system badge tokens
**Source:** `web/src/components/ui/Pill.tsx` color map (lines 14-30) — `success` = emerald, `warning` = amber, etc.
**Apply to:** the real/estimate badge ("réel" → `success`, "≈ estimé" → `warning`) and the new `Tooltip` surface styling, on both the result and detail pages.

---

## No Analog Found

| File | Role | Data Flow | Reason / Mitigation |
|------|------|-----------|---------------------|
| `web/src/components/ui/Tooltip.tsx` | UI atom | presentation | No tooltip/popover primitive exists in `web/src/components/ui/` (19 atoms checked; none is a tooltip). Build new, mirroring `Pill.tsx` prop/token conventions. Closest behavioral precedent is the Modal (`Modal.tsx`) for client-side open/close, but it is too heavy — keep Tooltip minimal. |

> Everything else has a strong in-repo analog. The TollGuru request/response *shape* is the only genuinely unverifiable area (no key this session — research Assumptions A1–A6); that is a runtime-verification gap, not a missing pattern. The defensive multi-path parse + silent fallback patterns above cover it structurally.

## Metadata

**Analog search scope:** `backend/src/{fuel-prices,trips,mapbox,database/migrations,common}`, `web/src/{components/ui,app/app/trips,types}`
**Files scanned:** ~16 read in full or targeted
**Pattern extraction date:** 2026-05-29
