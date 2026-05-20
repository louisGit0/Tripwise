import { Injectable, NotFoundException } from '@nestjs/common';
import { MapboxService, GeocodeFeature, DirectionsResult } from '../mapbox/mapbox.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { FuelPricesService, StationPrice } from '../fuel-prices/fuel-prices.service';
import { ChargingStationsService, ChargingStation } from '../charging-stations/charging-stations.service';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';
import { UserVehicle } from '../vehicles/entities/user-vehicle.entity';
import { CalculateTripDto } from './dto/calculate-trip.dto';

const ELECTRIC_DISCLAIMER =
  'Les tarifs affichés sont ceux configurés dans votre profil véhicule. Le coût réel sur une borne publique peut différer.';

// ── Cost types ─────────────────────────────────────────────────────────────────

export interface FuelCost {
  type: 'fuel';
  fuelType: string;
  consumptionLitres: number;
  pricePerLitre: number;
  priceSource: {
    originStation: StationPrice;
    destinationStation: StationPrice;
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

export type TripCost = FuelCost | ElectricCost;

export interface TripResult {
  distance: { meters: number; km: number };
  duration: { seconds: number; formatted: string };
  geometry: DirectionsResult['geometry'];
  waypoints: DirectionsResult['waypoints'];
  vehicle: {
    id: string;
    nickname: string | null;
    brand: string;
    model: string;
    fuelType: string;
    consumption: number;
  };
  cost?: TripCost;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class TripsService {
  constructor(
    private readonly mapbox: MapboxService,
    private readonly vehicles: VehiclesService,
    private readonly fuelPrices: FuelPricesService,
    private readonly chargingStations: ChargingStationsService,
  ) {}

  geocode(q: string, options?: { country?: string; limit?: number }): Promise<GeocodeFeature[]> {
    return this.mapbox.geocode(q, options);
  }

  async calculate(userId: string, dto: CalculateTripDto): Promise<TripResult> {
    const userVehicles = await this.vehicles.findUserVehicles(userId);
    const uv = userVehicles.find((v) => v.id === dto.userVehicleId);
    if (!uv) {
      throw new NotFoundException(
        `Véhicule ${dto.userVehicleId} introuvable ou n'appartient pas à cet utilisateur`,
      );
    }

    const directions = await this.mapbox.getDirections(dto.origin, dto.destination);
    const distanceKm = Math.round((directions.distanceMeters / 1000) * 10) / 10;
    const fuelType = uv.vehicleModel.fuelType as FuelType;

    const result: TripResult = {
      distance: { meters: directions.distanceMeters, km: distanceKm },
      duration: {
        seconds: directions.durationSeconds,
        formatted: this.formatDuration(directions.durationSeconds),
      },
      geometry: directions.geometry,
      waypoints: directions.waypoints,
      vehicle: {
        id: uv.id,
        nickname: uv.nickname,
        brand: uv.vehicleModel.brand,
        model: uv.vehicleModel.model,
        fuelType: uv.vehicleModel.fuelType,
        consumption: Number(uv.vehicleModel.consumption),
      },
    };

    if (fuelType === FuelType.ELECTRIC) {
      result.cost = await this.computeElectricCost(dto, distanceKm, uv, directions);
    } else {
      result.cost = await this.computeFuelCost(dto, distanceKm, fuelType, uv.vehicleModel.consumption);
    }

    return result;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async computeFuelCost(
    dto: CalculateTripDto,
    distanceKm: number,
    fuelType: FuelType,
    consumptionPer100km: number,
  ): Promise<FuelCost> {
    const { price, originStation, destinationStation } =
      await this.fuelPrices.averagePriceBetweenPoints(
        dto.origin.lat, dto.origin.lng,
        dto.destination.lat, dto.destination.lng,
        fuelType,
      );

    const consumptionLitres =
      Math.round(((distanceKm * Number(consumptionPer100km)) / 100) * 100) / 100;
    const totalCost = Math.round(consumptionLitres * price * 100) / 100;

    return {
      type: 'fuel',
      fuelType,
      consumptionLitres,
      pricePerLitre: Math.round(price * 1000) / 1000,
      priceSource: {
        originStation,
        destinationStation,
        source:
          originStation.source === 'api' && destinationStation.source === 'api'
            ? 'api'
            : 'fallback',
      },
      totalCost,
    };
  }

  private async computeElectricCost(
    dto: CalculateTripDto,
    distanceKm: number,
    uv: UserVehicle,
    directions: DirectionsResult,
  ): Promise<ElectricCost> {
    const chargingMode = dto.chargingMode ?? 'home';
    const consumptionKwh =
      Math.round(((distanceKm * Number(uv.vehicleModel.consumption)) / 100) * 100) / 100;

    const homePrice = Number(uv.homeElectricityPrice ?? 0);
    const publicPrice = Number(uv.publicChargingPrice ?? 0);

    let pricePerKwh: number;
    switch (chargingMode) {
      case 'public':
        pricePerKwh = publicPrice;
        break;
      case 'mix': {
        const ratio = dto.chargingMixRatio ?? 0.5;
        pricePerKwh = homePrice * ratio + publicPrice * (1 - ratio);
        break;
      }
      default:
        pricePerKwh = homePrice;
    }

    const totalCost = Math.round(consumptionKwh * pricePerKwh * 100) / 100;

    const allStations = await this.chargingStations.findStationsAlongRoute(
      directions.geometry,
      2000,
    );

    return {
      type: 'electric',
      consumptionKwh,
      pricePerKwh: Math.round(pricePerKwh * 10000) / 10000,
      chargingMode,
      totalCost,
      nearbyStations: allStations.slice(0, 20),
      disclaimer: ELECTRIC_DISCLAIMER,
    };
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
}
