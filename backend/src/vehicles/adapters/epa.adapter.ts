import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  CanonicalVehicle,
  CatalogSourceAdapter,
} from './catalog-source-adapter.interface';
import {
  combEToKwhPer100km,
  epaFuelToType,
  mpgToLper100km,
} from './conversions';
import { normalizeModel } from './ademe.adapter';

/**
 * EPA source adapter (US, fueleconomy.gov). Streams the committed, trimmed,
 * `;`-delimited snapshot (PD4-3) — NO network and NO parser dependency at sync
 * time. Applies the FR-relevant brand allow-list (rows from any other make are
 * skipped, CAT-04), maps EPA fuel labels → FuelType (PHEV → primary combustion
 * fuel, CNG/Hydrogen → skip), converts the right metric (combE for EVs, comb08
 * for ICE/diesel), and skips any row whose metric is missing/<=0 (Core Value:
 * consumption is never fabricated).
 */

/**
 * EPA `make` (as it appears in vehicles.csv) → canonical FR brand spelling
 * (aligned to AdemeAdapter's `normalizeBrand` output). A make NOT in this map is
 * skipped. Mercedes-Benz → Mercedes is the key alias (Pitfall 8).
 */
export const EPA_BRAND_ALLOWLIST: Record<string, string> = {
  Audi: 'Audi',
  BMW: 'BMW',
  MINI: 'Mini',
  'Mercedes-Benz': 'Mercedes', // ADEME spells it "Mercedes"
  Volkswagen: 'Volkswagen',
  Volvo: 'Volvo',
  Porsche: 'Porsche',
  Toyota: 'Toyota',
  Lexus: 'Lexus',
  Honda: 'Honda',
  Nissan: 'Nissan',
  Mazda: 'Mazda',
  Mitsubishi: 'Mitsubishi',
  Subaru: 'Subaru',
  Hyundai: 'Hyundai',
  Kia: 'Kia',
  Genesis: 'Genesis',
  'Land Rover': 'Land Rover',
  Jaguar: 'Jaguar',
  Fiat: 'Fiat',
  'Alfa Romeo': 'Alfa Romeo',
  Maserati: 'Maserati',
  Tesla: 'Tesla',
  Ford: 'Ford',
  Jeep: 'Jeep',
  Smart: 'Smart',
  Polestar: 'Polestar',
};

/** Snapshot columns, in the order the builder emits them. */
const SNAPSHOT_COLUMNS = [
  'make',
  'model',
  'year',
  'fuelType1',
  'fuelType2',
  'atvType',
  'comb08',
  'combE',
  'VClass',
] as const;

type SnapshotColumn = (typeof SNAPSHOT_COLUMNS)[number];
type EpaSnapshotRow = Record<SnapshotColumn, string>;

// ── Conservative model trim-strip (Pitfall 2) ────────────────────────────────
// Drop only clearly-suffix drivetrain / engine-displacement tokens from the END
// (always keep at least the first token). Accept residual imperfection — ADEME
// precedence + the allow-list bound any cross-source duplication.
const TRAILING_NOISE = new Set([
  'AWD', 'FWD', 'RWD', '4WD', '2WD', '4MATIC', 'QUATTRO',
  'TURBO', 'TDI', 'TFSI', 'TSI', 'HYBRID', 'PHEV', 'EV',
  'AUTO', 'MANUAL', 'CVT', 'DIESEL',
]);
const DISPLACEMENT = /^\d\.\d[a-z]?$/i; // 2.0, 2.0T, 3.0 — NOT 4-digit years
const DRIVETRAIN_PREFIX = /^(xdrive|sdrive)/i; // xDrive30i, sDrive18i

function stripTrim(model: string): string {
  const tokens = model.trim().split(/\s+/);
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (
      TRAILING_NOISE.has(last.toUpperCase()) ||
      DISPLACEMENT.test(last) ||
      DRIVETRAIN_PREFIX.test(last)
    ) {
      tokens.pop();
    } else {
      break;
    }
  }
  return tokens.join(' ');
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export class EpaAdapter implements CatalogSourceAdapter {
  readonly source = 'epa';
  readonly precedence = 10; // lower priority than ADEME (PD4-1)

  private readonly snapshotPath = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'epa-vehicles.snapshot.csv',
  );

  /**
   * Stream the committed `;`-delimited snapshot → raw column objects. Skips the
   * provenance comment line (`#…`) and the column-header line. Mirrors the
   * `import-ademe.ts` readline + split(';') idiom — no parser dependency.
   */
  async load(): Promise<EpaSnapshotRow[]> {
    const rows: EpaSnapshotRow[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(this.snapshotPath),
      crlfDelay: Infinity,
    });

    let headerSeen = false;
    for await (const line of rl) {
      if (!line || line.startsWith('#')) continue; // provenance comment
      if (!headerSeen) {
        headerSeen = true; // first non-comment line is the column header
        continue;
      }
      const values = line.split(';');
      const row = {} as EpaSnapshotRow;
      SNAPSHOT_COLUMNS.forEach((col, i) => {
        row[col] = values[i] ?? '';
      });
      rows.push(row);
    }
    return rows;
  }

  normalize(raw: unknown): CanonicalVehicle | null {
    const row = raw as EpaSnapshotRow;

    const make = (row.make ?? '').trim();
    const brand = EPA_BRAND_ALLOWLIST[make];
    if (!brand) return null; // not an FR-relevant make → skip (CAT-04)

    const mapped = epaFuelToType(row.fuelType1, row.atvType, row.fuelType2);
    if (!mapped) return null; // unmapped fuel (CNG/Hydrogen) → skip

    const metricValue = parseFloat(
      mapped.metric === 'combE' ? row.combE : row.comb08,
    );
    const consumption =
      mapped.metric === 'combE'
        ? combEToKwhPer100km(metricValue)
        : mpgToLper100km(metricValue);
    if (consumption === null) return null; // missing/<=0 metric → never fabricate

    const model = normalizeModel(stripTrim(row.model ?? ''));
    if (!model) return null;

    // NOTE: the locked CanonicalVehicle contract carries no `year` (the canonical
    // key excludes year — all model-years collapse to one entry). EPA's per-row
    // year is therefore metadata the merge (04-04) does not key on; we emit the
    // canonical row without it to keep the contract 04-04 consumes intact.
    return {
      brand,
      model,
      fuelType: mapped.fuelType,
      consumption,
      batteryCapacityKwh: null,
      tankCapacityLiters: null,
      source: this.source,
    };
  }
}
