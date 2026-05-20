import { FuelType, ChargingMode } from '../enums/index.js';

export interface CoordinatePoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface TripCalculateRequest {
  origin: CoordinatePoint;
  destination: CoordinatePoint;
  userVehicleId: string;
  /** Pour les véhicules électriques uniquement. Défaut : 'home'. */
  chargingMode?: ChargingMode;
  /** Proportion de charge à domicile (0–1) pour le mode 'mix'. Défaut : 0.5 */
  chargingMixRatio?: number;
}

export interface ChargingStation {
  id: string;
  name: string;
  operator: string;
  address: string;
  lat: number;
  lng: number;
  powerKw: number | null;
  connectorTypes: string[];
  openingHours: string | null;
  isFreeAccess: boolean;
  distanceKm: number;
}

export interface FuelStationInfo {
  stationName: string;
  address: string;
  price: number;
  distanceKm: number;
  source: 'api' | 'fallback';
}

export interface FuelCost {
  type: 'fuel';
  fuelType: FuelType;
  consumptionLitres: number;
  pricePerLitre: number;
  priceSource: {
    originStation: FuelStationInfo;
    destinationStation: FuelStationInfo;
    source: 'api' | 'fallback';
  };
  totalCost: number;
}

export interface ElectricCost {
  type: 'electric';
  consumptionKwh: number;
  pricePerKwh: number;
  chargingMode: ChargingMode;
  totalCost: number;
  nearbyStations: ChargingStation[];
  disclaimer: string;
}

export type TripCost = FuelCost | ElectricCost;

export interface TripVehicleInfo {
  id: string;
  nickname: string | null;
  brand: string;
  model: string;
  fuelType: FuelType;
  consumption: number;
}

export interface TripResult {
  distance: { meters: number; km: number };
  duration: { seconds: number; formatted: string };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  waypoints: Array<{ name: string; location: [number, number] }>;
  vehicle: TripVehicleInfo;
  cost?: TripCost;
}

export interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}
