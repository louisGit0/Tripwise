import type { FuelType, ChargingMode, EnergyUnit } from '../enums/index';

/** Coordonnées géographiques WGS84 avec label optionnel */
export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

/** Informations sur une station-service retournée par l'API prix carburants */
export interface StationInfo {
  stationName: string;
  address: string;
  price: number;
  distanceKm: number;
  source: 'api' | 'fallback';
}

/** Coût calculé pour un véhicule thermique */
export interface FuelCost {
  type: 'fuel';
  fuelType: FuelType;
  consumptionLitres: number;
  pricePerLitre: number;
  priceSource: {
    originStation: StationInfo | null;
    destinationStation: StationInfo | null;
    source: 'api' | 'fallback';
  };
  totalCost: number;
}

/** Borne de recharge IRVE */
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
  isFreeAccess: boolean | null;
  distanceKm: number;
}

/** Coût calculé pour un véhicule électrique */
export interface ElectricCost {
  type: 'electric';
  consumptionKwh: number;
  pricePerKwh: number;
  chargingMode: ChargingMode;
  totalCost: number;
  nearbyStations: ChargingStation[];
  disclaimer: string;
}

/** Distance calculée pour un trajet */
export interface TripDistance {
  meters: number;
  km: number;
}

/** Durée calculée pour un trajet */
export interface TripDuration {
  seconds: number;
  formatted: string;
}

/** Résumé du véhicule inclus dans la réponse de calcul */
export interface TripVehicleInfo {
  id: string;
  nickname: string | null;
  brand: string;
  model: string;
  fuelType: FuelType;
  consumption: number;
}

/** Réponse complète du endpoint POST /trips/calculate */
export interface TripResult {
  distance: TripDistance;
  duration: TripDuration;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  waypoints: Array<{ name: string; location: [number, number] }>;
  vehicle: TripVehicleInfo;
  cost: FuelCost | ElectricCost;
}

/** Corps de la requête POST /trips/calculate */
export interface TripCalculateRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  userVehicleId: string;
  chargingMode?: ChargingMode;
  /** Proportion de charge à domicile (0.0–1.0) — uniquement pour chargingMode='mix' */
  chargingMixRatio?: number;
}

/**
 * Trajet enregistré en base de données.
 * Créé automatiquement après chaque calcul réussi (fonctionnalité future).
 */
export interface SavedTrip {
  id: string;
  userId: string;
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
  energyUnit: EnergyUnit;
  /** L/100km ou kWh/100km — valeur du profil véhicule au moment du calcul */
  consumptionPer100: number;
  /** Consommation totale estimée (litres ou kWh) */
  totalConsumption: number;
  /** Prix unitaire appliqué (€/L ou €/kWh) */
  pricePerUnit: number;
  /** Coût total estimé en euros */
  totalCost: number;
  /** 'home' | 'public' | 'mix' — null pour les thermiques */
  chargingMode: string | null;
  tripDate: string;
  isArchived: boolean;
  createdAt: string;
}
