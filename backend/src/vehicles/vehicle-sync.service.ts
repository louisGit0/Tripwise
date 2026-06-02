import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
 */
export async function mergeCanonical(
  adapters: CatalogSourceAdapter[],
): Promise<CanonicalVehicle[]> {
  const ordered = [...adapters].sort((a, b) => a.precedence - b.precedence);
  const merged = new Map<string, CanonicalVehicle>();

  for (const adapter of ordered) {
    const raws = await adapter.load();
    for (const raw of raws) {
      const v = adapter.normalize(raw);
      if (!v) continue; // skip unmapped fuel / missing conso / filtered brand
      const key = `${v.brand}|${v.model}|${v.fuelType}`.toUpperCase();
      if (!merged.has(key)) merged.set(key, v); // first-writer-wins (ADEME wins)
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
    const merged = await mergeCanonical(adapters);
    this.logger.log(
      `Merged ${merged.length} unique vehicles across ${adapters.length} sources`,
    );

    // ── Step 2 : load existing null-year keys (single query) ───────────────
    const existingModels = await this.vehicleModelRepo.find({
      where: { year: IsNull() },
      select: { brand: true, model: true, fuelType: true },
    });
    const existingSet = new Set(
      existingModels.map((m) =>
        `${m.brand}|${m.model}|${m.fuelType}`.toUpperCase(),
      ),
    );

    // ── Step 3 : filter to genuinely new keys ──────────────────────────────
    const toInsert = merged.filter(
      (v) => !existingSet.has(`${v.brand}|${v.model}|${v.fuelType}`.toUpperCase()),
    );
    this.logger.log(`Inserting ${toInsert.length} new vehicle variants...`);

    // ── Step 4 : bulk insert in batches of BATCH_SIZE ──────────────────────
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert
        .slice(i, i + BATCH_SIZE)
        .map((v) => this.vehicleModelRepo.create(toEntityValues(v)));
      await this.vehicleModelRepo.save(batch);
    }

    const result: SyncResult = {
      created: toInsert.length,
      skipped: merged.length - toInsert.length,
      total: merged.length,
    };
    this.logger.log(`Multi-source sync complete — ${JSON.stringify(result)}`);
    return result;
  }
}
