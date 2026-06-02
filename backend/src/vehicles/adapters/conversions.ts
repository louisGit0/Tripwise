import { FuelType } from '../entities/vehicle-model.entity';

// ── Stub (RED phase) — real implementation lands in the GREEN commit ─────────

export const MPG_TO_L_PER_100KM = 0;
export const MILES_TO_KM = 0;

export function mpgToLper100km(_mpg: number): number | null {
  return null;
}

export function combEToKwhPer100km(_combE: number): number | null {
  return null;
}

export type EpaMetric = 'mpg' | 'combE';

export function epaFuelToType(
  _fuelType1: string,
  _atvType: string,
  _fuelType2?: string,
): { fuelType: FuelType; metric: EpaMetric } | null {
  return null;
}
