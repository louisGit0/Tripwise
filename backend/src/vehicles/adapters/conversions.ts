import { FuelType } from '../entities/vehicle-model.entity';

/**
 * EPA unit conversions + EPA→FuelType mapping (CAT-02).
 *
 * Two exact constants (no scattered magic numbers):
 *  - ICE/diesel:  L/100km = 235.214583 / MPG  (US gallon 3.785411784 L, mile 1.609344 km)
 *  - EV:          kWh/100km = combE / 1.609344 (combE is EPA kWh per 100 MILES)
 *
 * Core Value: a missing/<=0 source metric ALWAYS returns `null` so the caller
 * skips the row — consumption is never fabricated.
 */

/** L/100km = 235.214583 / MPG — the standard EPA↔metric constant. */
export const MPG_TO_L_PER_100KM = 235.214583;
/** 1 mile = 1.609344 km — divides combE (kWh/100mi) into kWh/100km. */
export const MILES_TO_KM = 1.609344;

/** Round to 1 decimal, matching the ADEME sync's rounding. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * US combined MPG → L/100km. Returns `null` (skip) for missing/<=0 MPG —
 * never a fabricated number, and no division by zero.
 */
export function mpgToLper100km(mpg: number): number | null {
  if (!mpg || mpg <= 0) return null;
  return round1(MPG_TO_L_PER_100KM / mpg);
}

/**
 * EPA `combE` (kWh per 100 miles) → kWh/100km. Returns `null` for missing/<=0.
 * EVs MUST use this (not `comb08`, which is MPGe — an energy-equivalent fiction).
 */
export function combEToKwhPer100km(combE: number): number | null {
  if (!combE || combE <= 0) return null;
  return round1(combE / MILES_TO_KM);
}

export type EpaMetric = 'mpg' | 'combE';

/**
 * Maps an EPA `fuelType1`/`atvType` pair to the app's {@link FuelType} AND the
 * metric the adapter must read ('mpg' = comb08, 'combE' = combE). Returning the
 * metric is what stops the adapter from ever running `combE` through the MPG
 * formula (Pitfall 3). `null` = unmappable fuel (CNG/Hydrogen) → skip.
 *
 * Decision order: PHEV/Hybrid first (collapse to the primary combustion fuel —
 * mirrors ADEME `ELEC+ESSENC HR → SP95`, one row per model, maintainer's-discretion
 * A4), then pure EV, then the straight `fuelType1` grades. US octane grades have
 * no SP95/SP98 distinction → all gasoline collapses to SP95 (matches the ADEME
 * `ESSENCE → SP95` convention).
 */
export function epaFuelToType(
  fuelType1: string,
  atvType: string,
  fuelType2?: string,
): { fuelType: FuelType; metric: EpaMetric } | null {
  const f1 = (fuelType1 ?? '').trim();
  const atv = (atvType ?? '').trim();
  const f2 = (fuelType2 ?? '').trim();

  const isDiesel = /diesel/i.test(f1) || /diesel/i.test(atv);
  const isGasoline = /gasoline/i.test(f1);
  const isElectricity = /electricity/i.test(f1);
  const isE85 = /e85|ethanol/i.test(f1) || /e85|ethanol/i.test(f2) || /ffv/i.test(atv);

  // 1. Plug-in / non-plug-in hybrid → primary COMBUSTION fuel, one row (mirrors ADEME).
  if (/plug-in hybrid/i.test(atv) || /hybrid/i.test(atv)) {
    return { fuelType: isDiesel ? FuelType.DIESEL : FuelType.SP95, metric: 'mpg' };
  }

  // 2. Pure EV → ELECTRIC, read combE (NOT comb08/MPGe).
  if (/^ev$/i.test(atv) || isElectricity) {
    return { fuelType: FuelType.ELECTRIC, metric: 'combE' };
  }

  // 3. Straight fuelType1 grades.
  if (isDiesel) return { fuelType: FuelType.DIESEL, metric: 'mpg' };
  if (isGasoline) return { fuelType: FuelType.SP95, metric: 'mpg' };
  // FFV / E85: list both fuels; prefer the gasoline figure → SP95 (plan action,
  // mirrors ADEME — keeps one canonical row instead of an E85 split).
  if (isE85) return { fuelType: FuelType.SP95, metric: 'mpg' };
  if (/lpg|propane/i.test(f1) || /lpg|propane/i.test(atv)) {
    return { fuelType: FuelType.GPL, metric: 'mpg' };
  }

  // 4. CNG / Hydrogen / Fuel Cell / unknown → not in the enum, never fabricate.
  return null;
}
