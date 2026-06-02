import { FuelType } from '../entities/vehicle-model.entity';

/**
 * Canonical, source-agnostic vehicle row produced by every
 * {@link CatalogSourceAdapter}. Consumption is ALREADY converted to the app's
 * canonical units (L/100km for ICE, kWh/100km for EV) and the brand/model are
 * normalized to ADEME's spelling — so the merge orchestrator (plan 04-04) can
 * dedup purely on `brand|model|fuelType` without any per-source knowledge.
 */
export interface CanonicalVehicle {
  /** Display-cased, ADEME spelling (e.g. EPA "Mercedes-Benz" → "Mercedes"). */
  brand: string;
  model: string;
  fuelType: FuelType;
  /** L/100km (ICE) or kWh/100km (EV) — already converted, never fabricated. */
  consumption: number;
  batteryCapacityKwh: number | null;
  tankCapacityLiters: number | null;
  /** Provenance tag written to the row: 'ademe' | 'epa' | future source. */
  source: string;
}

/**
 * The CAT-05 extensibility contract. A 3rd data source is added by implementing
 * this interface once and dropping it into the precedence-ordered adapter array
 * — NO change to the merge loop, the DB schema, or the upsert is required.
 */
export interface CatalogSourceAdapter {
  /** Provenance tag written to every row this adapter emits. */
  readonly source: string;
  /** 0 = highest priority (ADEME); 10 = EPA; a new source picks a number. */
  readonly precedence: number;
  /** ADEME: live paginated fetch; EPA: read the committed snapshot. */
  load(): Promise<unknown[]>;
  /** Convert + map + filter a raw row. `null` = skip (never fabricate). */
  normalize(raw: unknown): CanonicalVehicle | null;
}
