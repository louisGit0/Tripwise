// ── Geo ────────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

// ── Vehicles ───────────────────────────────────────────────────────────────────

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  fuelType: string;
  consumptionPer100km: number;
}

export interface UserVehicle {
  id: string;
  nickname: string | null;
  homeElectricityPrice: number | null;
  publicChargingPrice: number | null;
  vehicleModel: VehicleModel;
}

// ── Trip ───────────────────────────────────────────────────────────────────────

export interface ChargingStation {
  id: string;
  name: string;
  operator: string | null;
  address: string;
  lat: number;
  lng: number;
  powerKw: number | null;
  connectorTypes: string[];
  openingHours: string | null;
  isFreeAccess: boolean;
  distanceKm: number;
}

export interface FuelCost {
  type: 'fuel';
  fuelType: string;
  consumptionLitres: number;
  pricePerLitre: number;
  priceSource: {
    originStation: { stationName: string; price: number; distanceKm: number; source: string };
    destinationStation: { stationName: string; price: number; distanceKm: number; source: string };
    source: 'api' | 'fallback';
  };
  totalCost: number;
}

export interface ElectricCost {
  type: 'electric';
  consumptionKwh: number;
  pricePerKwh: number;
  chargingMode: 'home' | 'public' | 'mix';
  totalCost: number;
  nearbyStations: ChargingStation[];
  disclaimer: string;
}

export interface TripResult {
  distance: { meters: number; km: number };
  duration: { seconds: number; formatted: string };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  waypoints: Array<{ name: string; location: [number, number] }>;
  vehicle: {
    id: string;
    nickname: string | null;
    brand: string;
    model: string;
    fuelType: string;
    consumption: number;
  };
  cost?: FuelCost | ElectricCost;
}

// ── Favorites ──────────────────────────────────────────────────────────────────

export interface Favorite {
  id: string;
  name: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  vehicleId: string | null;
  createdAt: string;
}
