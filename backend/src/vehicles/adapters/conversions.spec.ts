/**
 * Unit tests — EPA unit conversions + EPA→FuelType mapping (CAT-02).
 *
 * Pure functions, no DB / no network. Worked examples come straight from
 * RESEARCH §"Code Examples — Unit Conversion": L/100km = 235.214583 / MPG and
 * kWh/100km = combE / 1.609344. The Core Value guard: every <=0/falsy metric
 * returns `null` (the row is skipped — consumption is NEVER fabricated).
 */
import {
  MPG_TO_L_PER_100KM,
  MILES_TO_KM,
  mpgToLper100km,
  combEToKwhPer100km,
  epaFuelToType,
} from './conversions';
import { FuelType } from '../entities/vehicle-model.entity';

describe('conversions — named constants', () => {
  it('exposes the exact EPA↔metric constants (no scattered magic numbers)', () => {
    expect(MPG_TO_L_PER_100KM).toBe(235.214583);
    expect(MILES_TO_KM).toBe(1.609344);
  });
});

describe('mpgToLper100km (ICE/diesel: US combined MPG → L/100km)', () => {
  it('converts 30 MPG → 7.8 L/100km', () => {
    expect(mpgToLper100km(30)).toBe(7.8);
  });

  it('converts 50 MPG → 4.7 L/100km', () => {
    expect(mpgToLper100km(50)).toBe(4.7);
  });

  it('converts 25 MPG → 9.4 L/100km', () => {
    expect(mpgToLper100km(25)).toBe(9.4);
  });

  it('returns null for 0 MPG (never fabricate / no div-by-zero)', () => {
    expect(mpgToLper100km(0)).toBeNull();
  });

  it('returns null for negative MPG', () => {
    expect(mpgToLper100km(-5)).toBeNull();
  });
});

describe('combEToKwhPer100km (EV: EPA kWh/100mi → kWh/100km)', () => {
  it('converts combE 30 → 18.6 kWh/100km', () => {
    expect(combEToKwhPer100km(30)).toBe(18.6);
  });

  it('converts combE 25 → 15.5 kWh/100km', () => {
    expect(combEToKwhPer100km(25)).toBe(15.5);
  });

  it('converts combE 38 → 23.6 kWh/100km', () => {
    expect(combEToKwhPer100km(38)).toBe(23.6);
  });

  it('returns null for combE 0 (never fabricate)', () => {
    expect(combEToKwhPer100km(0)).toBeNull();
  });
});

describe('epaFuelToType (EPA fuelType1/atvType → FuelType + metric)', () => {
  it("maps 'Regular Gasoline' → SP95 via comb08 (mpg)", () => {
    expect(epaFuelToType('Regular Gasoline', '')).toEqual({
      fuelType: FuelType.SP95,
      metric: 'mpg',
    });
  });

  it("maps 'Premium Gasoline' → SP95 via mpg", () => {
    expect(epaFuelToType('Premium Gasoline', '')).toEqual({
      fuelType: FuelType.SP95,
      metric: 'mpg',
    });
  });

  it("maps 'Diesel' → DIESEL via mpg", () => {
    expect(epaFuelToType('Diesel', '')).toEqual({
      fuelType: FuelType.DIESEL,
      metric: 'mpg',
    });
  });

  it("maps 'Electricity' → ELECTRIC via combE (NOT mpg)", () => {
    expect(epaFuelToType('Electricity', 'EV')).toEqual({
      fuelType: FuelType.ELECTRIC,
      metric: 'combE',
    });
  });

  it('maps a gas-primary PHEV (atvType Plug-in Hybrid) → SP95 via mpg (one row, mirrors ADEME)', () => {
    expect(epaFuelToType('Premium Gasoline', 'Plug-in Hybrid')).toEqual({
      fuelType: FuelType.SP95,
      metric: 'mpg',
    });
  });

  it('maps a diesel-primary PHEV → DIESEL via mpg', () => {
    expect(epaFuelToType('Diesel', 'Plug-in Hybrid')).toEqual({
      fuelType: FuelType.DIESEL,
      metric: 'mpg',
    });
  });

  it("maps a non-plug-in 'Hybrid' (e.g. Prius) → SP95 via mpg", () => {
    expect(epaFuelToType('Regular Gasoline', 'Hybrid')).toEqual({
      fuelType: FuelType.SP95,
      metric: 'mpg',
    });
  });

  it("returns null for 'CNG' (not in enum — skip, never fabricate)", () => {
    expect(epaFuelToType('CNG', 'CNG')).toBeNull();
  });

  it("returns null for 'Hydrogen' / Fuel Cell", () => {
    expect(epaFuelToType('Hydrogen', 'FCV')).toBeNull();
    expect(epaFuelToType('Hydrogen', 'Fuel Cell')).toBeNull();
  });
});
