export type FuelType = 'SP95' | 'SP95_E10' | 'SP98' | 'DIESEL' | 'E85' | 'GPL' | 'ELECTRIC';
export type AuthProvider = 'local' | 'google' | 'apple';
export type ChargingMode = 'home' | 'public' | 'mix';

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  locale: string;
  provider: AuthProvider;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  year?: number | null;
  fuelType: FuelType;
  consumption: number;
}

export interface UserVehicle {
  id: string;
  nickname: string | null;
  vehicleModel: VehicleModel;
  homeElectricityPrice: number | null;
  publicChargingPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface NearbyStation {
  id: string;
  name: string;
  operator?: string;
  address?: string;
  lat: number;
  lng: number;
  powerKw?: number;
  connectorTypes?: string[];
  openingHours?: string;
  isFreeAccess?: boolean;
  distanceKm?: number;
}

export interface StationInfo {
  stationName?: string;
  address?: string;
  price?: number;
  distanceKm?: number;
  source: string;
}

export interface FuelCostResult {
  type: 'fuel';
  fuelType: string;
  consumptionLitres: number;
  pricePerLitre: number;
  priceSource?: {
    originStation?: StationInfo;
    destinationStation?: StationInfo;
    source: string;
  };
  totalCost: number;
}

export interface ElectricCostResult {
  type: 'electric';
  consumptionKwh: number;
  pricePerKwh: number;
  chargingMode: ChargingMode;
  totalCost: number;
  nearbyStations?: NearbyStation[];
  disclaimer?: string;
}

export interface TripResult {
  distance: { meters: number; km: number };
  duration: { seconds: number; formatted: string };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  waypoints: Array<{ location: [number, number]; name: string }>;
  vehicle: {
    id: string;
    nickname: string | null;
    brand: string;
    model: string;
    fuelType: FuelType;
    consumption: number;
  };
  cost?: FuelCostResult | ElectricCostResult;
}

export interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number];
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export interface GeocodeResult {
  features: GeocodeFeature[];
}

export interface CatalogPage {
  data: VehicleModel[];
  total: number;
  page: number;
  limit: number;
}
