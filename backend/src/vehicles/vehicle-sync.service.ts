import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { VehicleModel, FuelType } from './entities/vehicle-model.entity';

// ── ADEME API types ────────────────────────────────────────────────────────

interface AdemeRecord {
  Marque?: string;
  'Modèle'?: string;
  Energie?: string;
  Conso_vitesse_mixte_Min?: number | null;
  Conso_vitesse_mixte_Max?: number | null;
  Conso_elec_Min?: number | null;
  Conso_elec_Max?: number | null;
  [key: string]: unknown;
}

interface AdemeResponse {
  total: number;
  results: AdemeRecord[];
  next?: string;
}

type NewVehicle = {
  brand: string;
  model: string;
  year: null;
  fuelType: FuelType;
  consumption: number;
  batteryCapacityKwh: null;
  tankCapacityLiters: null;
};

export interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ADEME_BASE_URL =
  'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines';
const PAGE_SIZE = 1000;
const BATCH_SIZE = 100;

/**
 * If the catalog already has at least this many entries, skip the automatic
 * startup sync (already populated from a previous run).
 */
const STARTUP_THRESHOLD = 500;

/**
 * Mapping from ADEME `Energie` field values to our `FuelType` enum.
 * `null` means "skip this energy type" (e.g. unknown fuel).
 */
const ENERGIE_TO_FUEL: Record<string, FuelType | null> = {
  ESSENCE:           FuelType.SP95,
  GAZOLE:            FuelType.DIESEL,
  'GAZ+ELEC HNR':    FuelType.SP95,   // non-plug-in gas hybrid → treat as gasoline
  'ESS+ELEC HNR':    FuelType.SP95,   // non-plug-in essence hybrid → treat as gasoline
  'ELEC+ESSENC HR':  FuelType.SP95,   // plug-in hybrid (gas primary) → treat as gasoline
  ELECTRIC:          FuelType.ELECTRIC,
  SUPERETHANOL:      FuelType.E85,
  'ESS+G.P.L.':      FuelType.GPL,
  'ELEC+GAZOLE HR':  FuelType.DIESEL, // plug-in hybrid (diesel primary) → treat as diesel
};

/** Brand names that should remain fully uppercase (acronyms / short codes). */
const UPPERCASE_BRANDS = new Set([
  'BMW', 'VW', 'MG', 'BYD', 'DS', 'KIA', 'JAC',
  'GMC', 'RAM', 'GWM', 'SWM', 'BAIC',
]);

// ── Name normalization helpers ─────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function normalizeBrand(raw: string): string {
  const trimmed = raw.trim();
  if (UPPERCASE_BRANDS.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return toTitleCase(trimmed);
}

function normalizeModel(raw: string): string {
  return toTitleCase(raw.trim());
}

// ── Consumption computation ────────────────────────────────────────────────

function avgOf(...values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function computeConsumption(record: AdemeRecord, fuelType: FuelType): number | null {
  if (fuelType === FuelType.ELECTRIC) {
    // ADEME electric consumption is in Wh/km → convert to kWh/100km: × 0.1
    // e.g. 179 Wh/km × 0.1 = 17.9 kWh/100km
    const mean = avgOf(record.Conso_elec_Min, record.Conso_elec_Max);
    if (mean === null || mean <= 0) return null;
    return Math.round(mean * 0.1 * 10) / 10; // kWh/100km, 1 decimal
  }
  // Thermal / hybrid: ADEME is already in L/100km
  const mean = avgOf(record.Conso_vitesse_mixte_Min, record.Conso_vitesse_mixte_Max);
  if (mean === null || mean <= 0) return null;
  return Math.round(mean * 10) / 10; // L/100km, 1 decimal
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
   * background ADEME sync without blocking the NestJS application boot.
   */
  async onApplicationBootstrap(): Promise<void> {
    const count = await this.vehicleModelRepo.count();
    if (count >= STARTUP_THRESHOLD) {
      this.logger.log(
        `Vehicle catalog already populated (${count} entries) — ADEME sync skipped`,
      );
      return;
    }
    this.logger.log(
      `Vehicle catalog has ${count} entries — launching ADEME sync in background...`,
    );
    void this.syncFromAdeme().catch((err: unknown) =>
      this.logger.error(
        'Background ADEME sync failed',
        err instanceof Error ? err.stack : String(err),
      ),
    );
  }

  /**
   * Fetches all vehicles from the ADEME Car Labelling dataset and inserts any
   * that are not already in the local catalog (idempotent).
   *
   * @throws ConflictException if a sync is already in progress.
   */
  async syncFromAdeme(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new ConflictException(
        'Une synchronisation ADEME est déjà en cours — réessayez dans quelques instants',
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
    // ── Step 1 : fetch raw ADEME data ──────────────────────────────────────
    const rawRecords = await this.fetchAllAdemeRecords();
    this.logger.log(`Fetched ${rawRecords.length} raw records from ADEME API`);

    // ── Step 2 : process & deduplicate in memory ───────────────────────────
    // Key: "brand|model|fuelType" — keeps the first occurrence when ADEME
    // lists multiple trims/options of the same model.
    const processedMap = new Map<string, NewVehicle>();

    for (const record of rawRecords) {
      const brand = normalizeBrand(record.Marque ?? '');
      const model = normalizeModel(record['Modèle'] ?? '');
      if (!brand || !model) continue;

      const fuelType = ENERGIE_TO_FUEL[record.Energie ?? ''];
      if (!fuelType) continue; // unknown or unhandled energy type

      const consumption = computeConsumption(record, fuelType);
      if (!consumption) continue;

      const key = `${brand}|${model}|${fuelType}`;
      if (!processedMap.has(key)) {
        processedMap.set(key, {
          brand,
          model,
          year: null,
          fuelType,
          consumption,
          batteryCapacityKwh: null,
          tankCapacityLiters: null,
        });
      }
    }

    this.logger.log(
      `Processed ${processedMap.size} unique vehicle variants from ADEME data`,
    );

    // ── Step 3 : load existing null-year records (single query) ────────────
    const existingModels = await this.vehicleModelRepo.find({
      where: { year: IsNull() },
      select: { brand: true, model: true, fuelType: true },
    });
    const existingSet = new Set(
      existingModels.map((m) => `${m.brand}|${m.model}|${m.fuelType}`),
    );

    // ── Step 4 : filter to genuinely new records ───────────────────────────
    const toInsert = [...processedMap.values()].filter(
      (r) => !existingSet.has(`${r.brand}|${r.model}|${r.fuelType}`),
    );
    this.logger.log(`Inserting ${toInsert.length} new vehicle variants...`);

    // ── Step 5 : bulk insert in batches of BATCH_SIZE ─────────────────────
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert
        .slice(i, i + BATCH_SIZE)
        .map((v) => this.vehicleModelRepo.create(v));
      await this.vehicleModelRepo.save(batch);
    }

    const result: SyncResult = {
      created: toInsert.length,
      skipped: processedMap.size - toInsert.length,
      total:   rawRecords.length,
    };
    this.logger.log(`ADEME sync complete — ${JSON.stringify(result)}`);
    return result;
  }

  private async fetchAllAdemeRecords(): Promise<AdemeRecord[]> {
    const records: AdemeRecord[] = [];
    let nextUrl: string | undefined = `${ADEME_BASE_URL}?size=${PAGE_SIZE}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(
          `ADEME API responded with HTTP ${response.status} for ${nextUrl}`,
        );
      }

      const data = (await response.json()) as AdemeResponse;
      records.push(...data.results);

      // data-fair returns an absolute `next` URL for the following page
      nextUrl = data.next ?? undefined;
    }

    return records;
  }
}
