import { FuelType } from '../entities/vehicle-model.entity';
import { mergeCanonical } from '../vehicle-sync.service';
import {
  CanonicalVehicle,
  CatalogSourceAdapter,
} from './catalog-source-adapter.interface';

/**
 * CAT-03 / CAT-05 — precedence merge orchestrator unit tests.
 *
 * DB-agnostic: drives `mergeCanonical` with hand-written stub adapters (no DB,
 * no network) so the merge logic is proven independently of the SQLite/Postgres
 * harness (the idempotency guarantee at the DB layer is the UNIQUE index +
 * ON CONFLICT, exercised by the e2e suite).
 */

// ── Test helpers ───────────────────────────────────────────────────────────

function vehicle(
  partial: Partial<CanonicalVehicle> & {
    brand: string;
    model: string;
    fuelType: FuelType;
    consumption: number;
    source: string;
  },
): CanonicalVehicle {
  return {
    batteryCapacityKwh: null,
    tankCapacityLiters: null,
    ...partial,
  };
}

/**
 * Stub adapter: `load()` returns its pre-built canonical rows, `normalize()` is
 * an identity pass-through. Exercises the precedence-sort + first-writer-wins
 * Map without any source-specific parsing.
 */
class StubAdapter implements CatalogSourceAdapter {
  constructor(
    readonly source: string,
    readonly precedence: number,
    private readonly rows: CanonicalVehicle[],
  ) {}

  load(): Promise<CanonicalVehicle[]> {
    return Promise.resolve(this.rows);
  }

  normalize(raw: unknown): CanonicalVehicle | null {
    return raw as CanonicalVehicle;
  }
}

const KEY = (v: CanonicalVehicle) =>
  `${v.brand}|${v.model}|${v.fuelType}`.toUpperCase();

// ── Tests ──────────────────────────────────────────────────────────────────

describe('mergeCanonical — ADEME-precedence first-writer-wins', () => {
  it('keeps the ADEME consumption when both sources emit the same canonical key (PD4-1)', async () => {
    // Arrange
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);
    const epa = new StubAdapter('epa', 10, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 7.9, source: 'epa' }),
    ]);

    // Act
    const merged = await mergeCanonical([ademe, epa]);

    // Assert
    expect(merged).toHaveLength(1);
    expect(merged[0].consumption).toBe(5.5);
    expect(merged[0].source).toBe('ademe');
  });

  it('gap-fills an EPA-only key absent from ADEME, tagged source epa', async () => {
    // Arrange
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);
    const epa = new StubAdapter('epa', 10, [
      vehicle({ brand: 'Tesla', model: 'Model 3', fuelType: FuelType.ELECTRIC, consumption: 15.0, source: 'epa' }),
    ]);

    // Act
    const merged = await mergeCanonical([ademe, epa]);

    // Assert
    expect(merged).toHaveLength(2);
    const tesla = merged.find((v) => v.brand === 'Tesla');
    expect(tesla).toBeDefined();
    expect(tesla?.source).toBe('epa');
  });

  it('collides on a case-insensitive (uppercased) key', async () => {
    // Arrange — same model spelled differently, same adapter
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Tesla', model: 'Model 3', fuelType: FuelType.ELECTRIC, consumption: 15.0, source: 'ademe' }),
      vehicle({ brand: 'TESLA', model: 'MODEL 3', fuelType: FuelType.ELECTRIC, consumption: 99.0, source: 'ademe' }),
    ]);

    // Act
    const merged = await mergeCanonical([ademe]);

    // Assert
    expect(merged).toHaveLength(1);
    expect(merged[0].brand).toBe('Tesla'); // first writer wins
    expect(merged[0].consumption).toBe(15.0);
  });

  it('enforces ADEME precedence regardless of adapter array order', async () => {
    // Arrange
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);
    const epa = new StubAdapter('epa', 10, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 7.9, source: 'epa' }),
    ]);

    // Act — EPA listed FIRST in the array; merge sorts by precedence
    const merged = await mergeCanonical([epa, ademe]);

    // Assert
    expect(merged).toHaveLength(1);
    expect(merged[0].consumption).toBe(5.5); // ADEME still wins
    expect(merged[0].source).toBe('ademe');
  });

  it('is idempotent — running twice yields an identical set (CAT-05)', async () => {
    // Arrange
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);
    const epa = new StubAdapter('epa', 10, [
      vehicle({ brand: 'Tesla', model: 'Model 3', fuelType: FuelType.ELECTRIC, consumption: 15.0, source: 'epa' }),
    ]);

    // Act
    const first = await mergeCanonical([ademe, epa]);
    const second = await mergeCanonical([ademe, epa]);

    // Assert — same size, same keyed values
    expect(second).toHaveLength(first.length);
    const firstKeys = first.map(KEY).sort();
    const secondKeys = second.map(KEY).sort();
    expect(secondKeys).toEqual(firstKeys);
    expect(second).toEqual(first);
  });

  it('extends with a 3rd adapter (precedence 20) adding exactly its new key (CAT-05)', async () => {
    // Arrange
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);
    const epa = new StubAdapter('epa', 10, [
      vehicle({ brand: 'Tesla', model: 'Model 3', fuelType: FuelType.ELECTRIC, consumption: 15.0, source: 'epa' }),
    ]);
    const baseline = await mergeCanonical([ademe, epa]);

    const thirdSource = new StubAdapter('jato', 20, [
      vehicle({ brand: 'BYD', model: 'Dolphin', fuelType: FuelType.ELECTRIC, consumption: 14.2, source: 'jato' }),
    ]);

    // Act — same merge loop, just one more adapter in the array
    const merged = await mergeCanonical([ademe, epa, thirdSource]);

    // Assert — exactly the new key added, nothing else changed
    expect(merged).toHaveLength(baseline.length + 1);
    const dolphin = merged.find((v) => v.brand === 'BYD');
    expect(dolphin).toBeDefined();
    expect(dolphin?.source).toBe('jato');
  });

  it('skips rows whose normalize returns null', async () => {
    // Arrange — an adapter that drops every row
    class NullAdapter implements CatalogSourceAdapter {
      readonly source = 'null-src';
      readonly precedence = 5;
      load(): Promise<CanonicalVehicle[]> {
        return Promise.resolve([
          vehicle({ brand: 'X', model: 'Y', fuelType: FuelType.SP95, consumption: 1, source: 'null-src' }),
        ]);
      }
      normalize(): CanonicalVehicle | null {
        return null;
      }
    }
    const ademe = new StubAdapter('ademe', 0, [
      vehicle({ brand: 'Renault', model: 'Clio', fuelType: FuelType.SP95, consumption: 5.5, source: 'ademe' }),
    ]);

    // Act
    const merged = await mergeCanonical([ademe, new NullAdapter()]);

    // Assert
    expect(merged).toHaveLength(1);
    expect(merged[0].brand).toBe('Renault');
  });
});
