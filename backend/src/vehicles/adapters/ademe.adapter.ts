import { FuelType } from '../entities/vehicle-model.entity';
import {
  CanonicalVehicle,
  CatalogSourceAdapter,
} from './catalog-source-adapter.interface';

/**
 * ADEME source adapter (France, WLTP). Extracted from `vehicle-sync.service.ts`
 * so the merge orchestrator (plan 04-04) drives every source through one
 * contract. Output is byte-identical in shape to today's sync — same brand/model
 * normalization, same ENERGIE_TO_FUEL map, same computeConsumption (electric
 * Wh/km ×0.1; thermal already L/100km), same skip-on-missing behaviour.
 *
 * NOTE: `vehicle-sync.service.ts` still owns the orchestration today — guts of
 * it move to the merge orchestrator in 04-04. This adapter is the ADEME half.
 */

// ── ADEME API types ──────────────────────────────────────────────────────────

export interface AdemeRecord {
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

// ── Constants ────────────────────────────────────────────────────────────────

const ADEME_BASE_URL =
  'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines';
const PAGE_SIZE = 1000;

/**
 * ADEME `Energie` field → `FuelType`. `null` = skip (unknown/unhandled).
 * Plug-in hybrids collapse to their primary combustion fuel (one row).
 */
const ENERGIE_TO_FUEL: Record<string, FuelType | null> = {
  ESSENCE: FuelType.SP95,
  GAZOLE: FuelType.DIESEL,
  'GAZ+ELEC HNR': FuelType.SP95, // non-plug-in gas hybrid → gasoline
  'ESS+ELEC HNR': FuelType.SP95, // non-plug-in essence hybrid → gasoline
  'ELEC+ESSENC HR': FuelType.SP95, // plug-in hybrid (gas primary) → gasoline
  ELECTRIC: FuelType.ELECTRIC,
  SUPERETHANOL: FuelType.E85,
  'ESS+G.P.L.': FuelType.GPL,
  'ELEC+GAZOLE HR': FuelType.DIESEL, // plug-in hybrid (diesel primary) → diesel
};

/** Brand names kept fully uppercase (acronyms / short codes). Shared with EPA. */
export const UPPERCASE_BRANDS = new Set([
  'BMW', 'VW', 'MG', 'BYD', 'DS', 'KIA', 'JAC',
  'GMC', 'RAM', 'GWM', 'SWM', 'BAIC',
]);

// ── Name normalization helpers (shared — imported by epa.adapter) ────────────

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function normalizeBrand(raw: string): string {
  const trimmed = raw.trim();
  if (UPPERCASE_BRANDS.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return toTitleCase(trimmed);
}

export function normalizeModel(raw: string): string {
  return toTitleCase(raw.trim());
}

// ── Consumption computation ──────────────────────────────────────────────────

function avgOf(...values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function computeConsumption(
  record: AdemeRecord,
  fuelType: FuelType,
): number | null {
  if (fuelType === FuelType.ELECTRIC) {
    // ADEME electric consumption is Wh/km → kWh/100km: × 0.1
    const mean = avgOf(record.Conso_elec_Min, record.Conso_elec_Max);
    if (mean === null || mean <= 0) return null;
    return Math.round(mean * 0.1 * 10) / 10;
  }
  // Thermal / hybrid: ADEME is already L/100km
  const mean = avgOf(
    record.Conso_vitesse_mixte_Min,
    record.Conso_vitesse_mixte_Max,
  );
  if (mean === null || mean <= 0) return null;
  return Math.round(mean * 10) / 10;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export class AdemeAdapter implements CatalogSourceAdapter {
  readonly source = 'ademe';
  readonly precedence = 0; // highest priority (PD4-1: ADEME wins on overlap)

  /** Live ADEME data-fair paginated fetch (native fetch + AbortSignal timeout). */
  async load(): Promise<AdemeRecord[]> {
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
      nextUrl = data.next ?? undefined;
    }
    return records;
  }

  normalize(raw: unknown): CanonicalVehicle | null {
    const record = raw as AdemeRecord;

    const brand = normalizeBrand(record.Marque ?? '');
    const model = normalizeModel(record['Modèle'] ?? '');
    if (!brand || !model) return null;

    const fuelType = ENERGIE_TO_FUEL[record.Energie ?? ''];
    if (!fuelType) return null; // unknown / unhandled energy

    const consumption = computeConsumption(record, fuelType);
    if (!consumption) return null; // never fabricate

    return {
      brand,
      model,
      fuelType,
      consumption,
      batteryCapacityKwh: null,
      tankCapacityLiters: null,
      source: this.source,
    };
  }
}
