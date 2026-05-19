import { Injectable, NotFoundException } from '@nestjs/common';
import { MapboxService, GeocodeFeature, DirectionsResult } from '../mapbox/mapbox.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CalculateTripDto } from './dto/calculate-trip.dto';

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
  // cost sera ajouté dans le prochain module (calcul du coût)
}

@Injectable()
export class TripsService {
  constructor(
    private readonly mapbox: MapboxService,
    private readonly vehicles: VehiclesService,
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

    return {
      distance: {
        meters: directions.distanceMeters,
        km: Math.round((directions.distanceMeters / 1000) * 10) / 10,
      },
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
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
}
