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
  licensePlate: string | null;
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
  items: VehicleModel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TripStats {
  month?: string;
  totalCost: number;
  totalDistance: number;
  tripCount: number;
  averageCostPerKm: number | null;
  /** Backend returns { amount, percent }, not a bare number */
  savedVsGas: { amount: number; percent: number };
  dailyExpenses: Array<{ date: string; cost: number }>;
}

export interface SavedTrip {
  id: string;
  vehicleId: string | null;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationSeconds: number;
  fuelType: FuelType;
  energyUnit: 'L' | 'kWh';
  consumptionPer100: number;
  totalConsumption: number;
  pricePerUnit: number;
  totalCost: number;
  chargingMode: string | null;
  tripDate: string;
  isArchived: boolean;
  note: string | null;
  passengersCount: number;
  tollsCost: number;
  createdAt?: string;
}

export interface TripHistoryPage {
  items: SavedTrip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  monthlyTotals: Record<string, { totalCost: number; tripCount: number; totalDistance: number }>;
}

export interface EnergyComparison {
  category: 'gas' | 'diesel' | 'ev' | 'gpl';
  label: string;
  isCurrent: boolean;
  consumption: number;
  consumptionUnit: 'L' | 'kWh';
  unitPrice: number;
  totalCost: number;
  costPerKm: number;
  costPerPerson: number;
}

export interface MultiCalcResult {
  distance: { meters: number; km: number };
  duration: { seconds: number; formatted: string };
  comparisons: EnergyComparison[];
  disclaimer?: string;
}

export interface DefaultPrices {
  gas: number;
  diesel: number;
  evHome: number;
  evFast: number;
}

/** Stored in sessionStorage under 'tripwise.pendingTrip' after a calculation */
export interface PendingTripSession {
  origin: GeoPoint | null;
  destination: GeoPoint | null;
  distanceKm?: number;
  result: TripResult;
  multiResult: MultiCalcResult | null;
  selectedVehicleId: string;
  mode: 'address' | 'distance';
}

export interface UserVehicleWithStats extends UserVehicle {
  tripsCount: number;
  totalDistance: number;
  totalSpent: number;
  costPerKm: number;
  isDefault: boolean;
}
