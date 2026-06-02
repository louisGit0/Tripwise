import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleModel } from './entities/vehicle-model.entity';
import {
  CanonicalVehicle,
  CatalogSourceAdapter,
} from './adapters/catalog-source-adapter.interface';
import { AdemeAdapter } from './adapters/ademe.adapter';
import { EpaAdapter } from './adapters/epa.adapter';

export interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

/**
 * If the catalog already has at least this many entries, skip the automatic
 * startup sync (already populated from a previous run).
 *
 * Threshold rationale (multi-source interaction): production currently holds
 * ~266 ADEME rows (< 500), so on the NEXT deploy the boot count is below the
 * threshold and the FULL multi-source sync (ADEME + EPA) runs ONCE, growing the
 * catalog to thousands. Every subsequent boot then sees count >= 500 and skips
 * — no expensive per-boot re-syncs. The manual `POST /vehicles/sync` endpoint
 * remains available to refresh the catalog on demand.
 */
const STARTUP_THRESHOLD = 500;

// ── Precedence merge (CAT-03 / CAT-05) ───────────────────────────────────────

/**
 * Precedence-ordered, source-agnostic merge.
 *
 * Sorts adapters by `precedence` ascending (ADEME=0 first, EPA=10 second), then
 * runs each adapter's `load()` + `normalize()` (skipping nulls) into a Map keyed
 * by the uppercased `brand|model|fuelType`. First-writer-wins → ADEME wins on
 * overlap (PD4-1); EPA only fills keys ADEME didn't have. DB-agnostic and
 * idempotent: re-running rebuilds the identical set. A 3rd adapter drops into the
 * array with no change here (CAT-05).
 *
 * WR-04 (failure isolation): each adapter's load+normalize runs in its own
 * try/catch so ONE source failing (e.g. EPA snapshot ENOENT) is reported via
 * `onAdapterError` and SKIPPED — the other sources (notably ADEME) still
 * ingest. An EPA snapshot problem must never sink the whole catalog sync.
 */
export async function mergeCanonical(
  adapters: CatalogSourceAdapter[],
  onAdapterError?: (source: string, err: unknown) => void,
): Promise<CanonicalVehicle[]> {
  const ordered = [...adapters].sort((a, b) => a.precedence - b.precedence);
  const merged = new Map<string, CanonicalVehicle>();

  for (const adapter of ordered) {
    try {
      const raws = await adapter.load();
      for (const raw of raws) {
        const v = adapter.normalize(raw);
        if (!v) continue; // skip unmapped fuel / missing conso / filtered brand
        const key = `${v.brand}|${v.model}|${v.fuelType}`.toUpperCase();
        if (!merged.has(key)) merged.set(key, v); // first-writer-wins (ADEME wins)
      }
    } catch (err: unknown) {
      // Isolate this source's failure; let the others continue (WR-04).
      if (onAdapterError) onAdapterError(adapter.source, err);
    }
  }

  return [...merged.values()];
}

/** Map a canonical row to the entity insert shape (year excluded from the key). */
function toEntityValues(v: CanonicalVehicle): Partial<VehicleModel> {
  return {
    brand: v.brand,
    model: v.model,
    year: null,
    fuelType: v.fuelType,
    consumption: v.consumption,
    batteryCapacityKwh: v.batteryCapacityKwh,
    tankCapacityLiters: v.tankCapacityLiters,
    source: v.source,
  };
}

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class VehicleSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VehicleSyncService.name);
  private isSyncing = false;

  constructor(
    @InjectRepository(VehicleModel)
    private readonly vehicleModelRepo: Repository<VehicleModel>,
  ) {}

  /**
   * Checks catalog size at startup. If below STARTUP_THRESHOLD, triggers a
   * background multi-source sync without blocking the NestJS application boot.
   */
  async onApplicationBootstrap(): Promise<void> {
    // Skip the auto-sync under the test harness: it would hit the live ADEME
    // network and (now that the upsert uses ON CONFLICT DO UPDATE) overwrite
    // seeded test fixtures non-deterministically. The merge is unit-proven
    // (catalog-merge.spec.ts) and the manual `POST /vehicles/sync` covers runtime.
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('Test environment — multi-source bootstrap sync skipped');
      return;
    }

    const count = await this.vehicleModelRepo.count();
    if (count >= STARTUP_THRESHOLD) {
      this.logger.log(
        `Vehicle catalog already populated (${count} entries) — multi-source sync skipped`,
      );
      return;
    }
    this.logger.log(
      `Vehicle catalog has ${count} entries — launching multi-source sync in background...`,
    );
    void this.syncFromAdeme().catch((err: unknown) =>
      this.logger.error(
        'Background multi-source sync failed',
        err instanceof Error ? err.stack : String(err),
      ),
    );
  }

  /**
   * Runs the full multi-source merge (ADEME precedence-first, then EPA) and
   * upserts the result idempotently. Kept named `syncFromAdeme` so the existing
   * `POST /vehicles/sync` controller route (plan 04-03) needs no change.
   *
   * @throws ConflictException if a sync is already in progress.
   */
  async syncFromAdeme(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new ConflictException(
        'Une synchronisation du catalogue est déjà en cours — réessayez dans quelques instants',
      );
    }
    this.isSyncing = true;
    try {
      return await this.doSync();
    } finally {
      this.isSyncing = false;
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async doSync(): Promise<SyncResult> {
    // ── Step 1 : precedence-ordered merge across every source ──────────────
    const adapters: CatalogSourceAdapter[] = [
      new AdemeAdapter(),
      new EpaAdapter(),
    ];
    const merged = await mergeCanonical(adapters, (source, err) =>
      // WR-04: a single source failing (e.g. EPA snapshot missing from
      // dist/data) logs a warning and is skipped — ADEME still ingests.
      this.logger.warn(
        `Catalog source "${source}" failed to load — skipping it; other sources continue: ` +
          (err instanceof Error ? err.message : String(err)),
      ),
    );
    this.logger.log(
      `Merged ${merged.length} unique vehicles across ${adapters.length} sources`,
    );

    // ── Step 2 : split by source for the right ON CONFLICT policy ──────────
    // ADEME is authoritative → DO UPDATE; EPA never overwrites ADEME → DO
    // NOTHING (belt-and-suspenders: the in-memory merge already dropped EPA
    // rows that overlap ADEME). The canonical UNIQUE(brand,model,fuel_type)
    // index is the conflict target and the idempotency safety net (CAT-05) —
    // this resolves DEF-04-01-01 (legacy `repo.save()` UNIQUE collision).
    const ademeRows = merged.filter((v) => v.source === 'ademe');
    const epaRows = merged.filter((v) => v.source !== 'ademe');

    const before = await this.vehicleModelRepo.count();

    // ADEME batches: refresh consumption/capacities/source on conflict.
    for (let i = 0; i < ademeRows.length; i += BATCH_SIZE) {
      const batch = ademeRows.slice(i, i + BATCH_SIZE).map(toEntityValues);
      await this.vehicleModelRepo
        .createQueryBuilder()
        .insert()
        .into(VehicleModel)
        .values(batch)
        .orUpdate(
          ['consumption', 'battery_capacity_kwh', 'tank_capacity_liters', 'source'],
          ['brand', 'model', 'fuel_type'],
        )
        .execute();
    }

    // EPA batches: ON CONFLICT DO NOTHING — never overwrite ADEME (PD4-1).
    for (let i = 0; i < epaRows.length; i += BATCH_SIZE) {
      const batch = epaRows.slice(i, i + BATCH_SIZE).map(toEntityValues);
      await this.vehicleModelRepo
        .createQueryBuilder()
        .insert()
        .into(VehicleModel)
        .values(batch)
        .orIgnore()
        .execute();
    }

    const after = await this.vehicleModelRepo.count();
    const created = after - before;
    const result: SyncResult = {
      created,
      skipped: merged.length - created,
      total: merged.length,
    };
    this.logger.log(
      `Multi-source sync complete — ${JSON.stringify(result)} ` +
        `(ademe=${ademeRows.length}, epa=${epaRows.length})`,
    );
    return result;
  }
}
