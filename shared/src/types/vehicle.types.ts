import { FuelType } from '../enums/index.js';

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  fuelType: FuelType;
  /** L/100km pour les thermiques, kWh/100km pour les électriques. */
  consumption: number;
}

export interface UserVehicle {
  id: string;
  userId: string;
  nickname: string | null;
  vehicleModel: VehicleModel;
  homeElectricityPrice: number | null;
  publicChargingPrice: number | null;
  createdAt: string;
}

export interface AddVehicleRequest {
  vehicleModelId: string;
  nickname?: string;
  homeElectricityPrice?: number;
  publicChargingPrice?: number;
}

export interface UpdateVehicleRequest {
  nickname?: string;
  homeElectricityPrice?: number;
  publicChargingPrice?: number;
}

export interface VehicleCatalogQuery {
  search?: string;
  fuelType?: FuelType;
  page?: number;
  limit?: number;
}
