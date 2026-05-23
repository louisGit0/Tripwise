import type { FuelType } from '../enums/index';

/** Modèle de véhicule du catalogue (données constructeur) */
export interface VehicleModelEntry {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  fuelType: FuelType;
  /** L/100km pour les thermiques, kWh/100km pour les électriques (indicatif WLTP) */
  consumption: number;
  /** Capacité brute de la batterie en kWh — null pour les thermiques (indicatif) */
  batteryCapacityKwh: number | null;
  /** Capacité du réservoir en litres — null pour les électriques (indicatif) */
  tankCapacityLiters: number | null;
}

/** Véhicule associé à un compte utilisateur */
export interface UserVehicle {
  id: string;
  userId: string;
  vehicleModelId: string;
  nickname: string | null;
  /** €/kWh tarif domicile — uniquement pour les électriques */
  homeElectricityPrice: number | null;
  /** €/kWh tarif borne publique — uniquement pour les électriques */
  publicChargingPrice: number | null;
  /** Plaque d'immatriculation — optionnelle, affichage uniquement */
  licensePlate: string | null;
  /** Véhicule par défaut de l'utilisateur */
  isDefault: boolean;
  /**
   * Proportion des recharges effectuées à domicile (0.00–1.00).
   * Utilisée pour le mode de recharge « mix » dans le calcul de trajet.
   */
  homeChargingRatio: number | null;
  createdAt: string;
  updatedAt: string;
  vehicleModel: VehicleModelEntry;
}

/** Corps de la requête d'ajout d'un véhicule */
export interface AddVehicleRequest {
  vehicleModelId: string;
  nickname?: string;
  homeElectricityPrice?: number;
  publicChargingPrice?: number;
  licensePlate?: string;
  isDefault?: boolean;
  homeChargingRatio?: number;
}

/** Corps de la requête de mise à jour d'un véhicule */
export interface UpdateVehicleRequest {
  nickname?: string;
  homeElectricityPrice?: number;
  publicChargingPrice?: number;
  licensePlate?: string;
  isDefault?: boolean;
  homeChargingRatio?: number;
}

/** Paramètres de recherche dans le catalogue */
export interface VehicleCatalogQuery {
  search?: string;
  fuelType?: FuelType;
  page?: number;
  limit?: number;
}
