import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapboxService, GeocodeFeature, DirectionsResult } from '../mapbox/mapbox.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { FuelPricesService, StationPrice } from '../fuel-prices/fuel-prices.service';
import { ChargingStationsService, ChargingStation } from '../charging-stations/charging-stations.service';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';
import { UserVehicle } from '../vehicles/entities/user-vehicle.entity';
import { Trip, EnergyUnit } from './entities/trip.entity';
import { CalculateTripDto } from './dto/calculate-trip.dto';
import { SaveTripDto } from './dto/save-trip.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { CalculateMultiDto } from './dto/calculate-multi.dto';
import { toCategory, FuelCategory } from '../common/fuel-type-categories';
import {
  DEFAULT_GAS_CONSUMPTION,
  DEFAULT_DIESEL_CONSUMPTION,
  DEFAULT_EV_CONSUMPTION,
  DEFAULT_GAS_PRICE,
  DEFAULT_DIESEL_PRICE,
  DEFAULT_EV_HOME,
  DEFAULT_EV_FAST,
  DEFAULT_FAST_SHARE,
} from '../common/calculation-constants';

const ELECTRIC_DISCLAIMER =
  'Les tarifs affichés sont ceux configurés dans votre profil véhicule. Le coût réel sur une borne publique peut différer.';

// ── Existing cost types (kept as-is for /calculate) ────────────────────────

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
  tollCost: number | null;
  /** true si le coût de péage est une estimation heuristique (pas TollGuru) */
  tollIsEstimate: boolean;
}

// ── Multi-energy comparison type ────────────────────────────────────────────

export interface EnergyComparison {
  category: FuelCategory;
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
  geometry: DirectionsResult['geometry'];
  waypoints: DirectionsResult['waypoints'];
  comparisons: EnergyComparison[];
  disclaimer?: string;
}

// ── History / stats types ───────────────────────────────────────────────────

export interface MonthlyTotal {
  totalCost: number;
  tripCount: number;
  totalDistance: number;
}

export interface TripHistoryPage {
  items: Trip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Totaux groupés par mois YYYY-MM sur la page courante uniquement */
  monthlyTotals: Record<string, MonthlyTotal>;
}

export interface DailyExpense {
  date: string; // YYYY-MM-DD
  cost: number;
  fuelCategory: FuelCategory | 'mixed';
}

export interface TripStats {
  month: string;
  totalCost: number;
  totalDistance: number;
  tripCount: number;
  averageCostPerKm: number | null;
  /**
   * Économie estimée par rapport à un trajet équivalent en essence moyenne.
   * Calculé uniquement sur les trajets avec véhicule électrique.
   * null si aucun trajet électrique ce mois-ci (pas applicable aux utilisateurs 100% thermique).
   */
  savedVsGas: { amount: number; percent: number } | null;
  dailyExpenses: DailyExpense[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convertit une FuelCategory en liste de FuelType correspondants */
function categoryToFuelTypes(category: string): FuelType[] {
  const map: Record<string, FuelType[]> = {
    gas:    [FuelType.SP95, FuelType.SP95_E10, FuelType.SP98, FuelType.E85],
    diesel: [FuelType.DIESEL],
    ev:     [FuelType.ELECTRIC],
    gpl:    [FuelType.GPL],
  };
  return map[category] ?? (Object.values(FuelType) as FuelType[]);
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(UserVehicle)
    private readonly vehicleRepo: Repository<UserVehicle>,
    private readonly mapbox: MapboxService,
    private readonly vehicles: VehiclesService,
    private readonly fuelPrices: FuelPricesService,
    private readonly chargingStations: ChargingStationsService,
    private readonly config: ConfigService,
  ) {}

  // ── Existing endpoints ─────────────────────────────────────────────────────

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

    const [cost, tollResult] = await Promise.all([
      fuelType === FuelType.ELECTRIC
        ? this.computeElectricCost(dto, distanceKm, uv, directions)
        : this.computeFuelCost(dto, distanceKm, fuelType, uv.vehicleModel.consumption),
      this.computeTollCost(
        dto.origin,
        dto.destination,
        distanceKm,
        directions.durationSeconds,
      ),
    ]);

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
      cost,
      tollCost:      tollResult?.cost ?? null,
      tollIsEstimate: tollResult?.isEstimate ?? false,
    };

    return result;
  }

  // ── Save trip ──────────────────────────────────────────────────────────────

  async saveTrip(userId: string, dto: SaveTripDto): Promise<Trip> {
    // Vérifier que le véhicule appartient à cet utilisateur
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.userVehicleId, userId },
    });
    if (!vehicle) {
      throw new ForbiddenException(
        `Véhicule ${dto.userVehicleId} introuvable ou n'appartient pas à cet utilisateur`,
      );
    }

    const distanceKm = dto.distanceMeters / 1000;
    // Consommation aux 100km calculée depuis la consommation totale et la distance
    const consumptionPer100 = distanceKm > 0
      ? round2((dto.energyAmount / distanceKm) * 100)
      : 0;

    const trip = this.tripRepo.create({
      userId,
      vehicleId:        dto.userVehicleId,
      originLabel:      dto.origin.label ?? '',
      originLat:        dto.origin.lat,
      originLng:        dto.origin.lng,
      destinationLabel: dto.destination.label ?? '',
      destinationLat:   dto.destination.lat,
      destinationLng:   dto.destination.lng,
      distanceKm,
      durationSeconds:  dto.durationSeconds,
      fuelType:         dto.fuelType,
      energyUnit:       dto.energyUnit as EnergyUnit,
      consumptionPer100,
      totalConsumption: dto.energyAmount,
      pricePerUnit:     dto.unitPrice,
      totalCost:        dto.totalCost,
      tollsCost:        dto.tollsCost ?? 0,
      passengersCount:  dto.passengersCount ?? 1,
      note:             dto.note ?? null,
      tripDate:         dto.tripDate ? new Date(dto.tripDate) : new Date(),
      isArchived:       false,
    });

    return this.tripRepo.save(trip);
  }

  // ── History ─────────────────────────────────────────────────────────────────

  async getHistory(userId: string, query: HistoryQueryDto): Promise<TripHistoryPage> {
    const { page, limit, fuelCategory, month, includeArchived } = query;

    const qb = this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId })
      .orderBy('trip.tripDate', 'DESC');

    if (!includeArchived) {
      qb.andWhere('trip.isArchived = :archived', { archived: false });
    }

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end   = new Date(year, m, 1);
      qb.andWhere('trip.tripDate >= :start AND trip.tripDate < :end', { start, end });
    }

    if (fuelCategory) {
      const types = categoryToFuelTypes(fuelCategory);
      qb.andWhere('trip.fuelType IN (:...types)', { types });
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      monthlyTotals: this.computeMonthlyTotals(items),
    };
  }

  /** Regroupe les trips par mois YYYY-MM pour les sous-headers de l'UI. */
  private computeMonthlyTotals(trips: Trip[]): Record<string, MonthlyTotal> {
    const result: Record<string, MonthlyTotal> = {};
    for (const trip of trips) {
      const d   = new Date(trip.tripDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!result[key]) result[key] = { totalCost: 0, tripCount: 0, totalDistance: 0 };
      result[key].totalCost     += Number(trip.totalCost);
      result[key].tripCount     += 1;
      result[key].totalDistance += Number(trip.distanceKm);
    }
    // Arrondir les totaux
    for (const key of Object.keys(result)) {
      result[key].totalCost     = round2(result[key].totalCost);
      result[key].totalDistance = Math.round(result[key].totalDistance * 10) / 10;
    }
    return result;
  }

  // ── Detail ──────────────────────────────────────────────────────────────────

  async getTripById(userId: string, tripId: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: { vehicle: { vehicleModel: true } },
    });
    if (!trip) throw new NotFoundException(`Trajet ${tripId} introuvable`);
    if (trip.userId !== userId) throw new ForbiddenException('Accès refusé à ce trajet');
    return trip;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.tripRepo.findOneBy({ id: tripId });
    if (!trip) throw new NotFoundException(`Trajet ${tripId} introuvable`);
    if (trip.userId !== userId) throw new ForbiddenException('Accès refusé à ce trajet');

    if (dto.note !== undefined)       trip.note      = dto.note;
    if (dto.isArchived !== undefined) trip.isArchived = dto.isArchived;
    if (dto.tripDate !== undefined)   trip.tripDate   = new Date(dto.tripDate);

    return this.tripRepo.save(trip);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const trip = await this.tripRepo.findOneBy({ id: tripId });
    if (!trip) throw new NotFoundException(`Trajet ${tripId} introuvable`);
    if (trip.userId !== userId) throw new ForbiddenException('Accès refusé à ce trajet');
    await this.tripRepo.remove(trip);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  async getStats(userId: string, query: StatsQueryDto): Promise<TripStats> {
    const now   = new Date();
    const month = query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, monthNum] = month.split('-').map(Number);
    const start = new Date(year, monthNum - 1, 1);
    const end   = new Date(year, monthNum, 1);

    const trips = await this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId })
      .andWhere('trip.isArchived = :archived', { archived: false })
      .andWhere('trip.tripDate >= :start AND trip.tripDate < :end', { start, end })
      .getMany();

    if (trips.length === 0) {
      return {
        month,
        totalCost:        0,
        totalDistance:    0,
        tripCount:        0,
        averageCostPerKm: null,
        savedVsGas:       null,
        dailyExpenses:    [],
      };
    }

    const totalCost     = trips.reduce((s, t) => s + Number(t.totalCost), 0);
    const totalDistance = trips.reduce((s, t) => s + Number(t.distanceKm), 0);
    const tripCount     = trips.length;
    const averageCostPerKm = totalDistance > 0 ? round2(totalCost / totalDistance) : null;

    // savedVsGas : comparaison fictive vs essence — uniquement pour les trajets électriques
    const evTrips = trips.filter((t) => t.fuelType === FuelType.ELECTRIC);
    let savedVsGas: { amount: number; percent: number } | null = null;
    if (evTrips.length > 0) {
      const evTotalCost = evTrips.reduce((s, t) => s + Number(t.totalCost), 0);
      let hypotheticalGasCost = 0;
      for (const trip of evTrips) {
        hypotheticalGasCost += (Number(trip.distanceKm) / 100) * DEFAULT_GAS_CONSUMPTION * DEFAULT_GAS_PRICE;
      }
      const savedAmount  = round2(hypotheticalGasCost - evTotalCost);
      const savedPercent = hypotheticalGasCost > 0
        ? round2((savedAmount / hypotheticalGasCost) * 100)
        : 0;
      savedVsGas = { amount: savedAmount, percent: savedPercent };
    }

    // dailyExpenses : agrégation par jour
    const dayMap = new Map<string, { cost: number; categories: Set<FuelCategory> }>();
    for (const trip of trips) {
      const key = new Date(trip.tripDate).toISOString().substring(0, 10);
      if (!dayMap.has(key)) dayMap.set(key, { cost: 0, categories: new Set() });
      const day = dayMap.get(key)!;
      day.cost += Number(trip.totalCost);
      day.categories.add(toCategory(trip.fuelType));
    }

    const dailyExpenses: DailyExpense[] = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, { cost, categories }]) => {
        const cats = [...categories];
        return {
          date,
          cost:         round2(cost),
          fuelCategory: cats.length > 1 ? 'mixed' : (cats[0] ?? 'gas'),
        };
      });

    return {
      month,
      totalCost:        round2(totalCost),
      totalDistance:    Math.round(totalDistance * 10) / 10,
      tripCount,
      averageCostPerKm,
      savedVsGas,
      dailyExpenses,
    };
  }

  // ── Multi-energy comparison ─────────────────────────────────────────────────

  async calculateMulti(userId: string, dto: CalculateMultiDto): Promise<MultiCalcResult> {
    const directions = await this.mapbox.getDirections(dto.origin, dto.destination);
    const distanceKm = round2(directions.distanceMeters / 1000);
    const passengers = dto.passengersCount ?? 1;

    // Véhicule courant (optionnel)
    type VehicleWithModel = UserVehicle & { vehicleModel: NonNullable<UserVehicle['vehicleModel']> };
    let currentVehicle: VehicleWithModel | null = null;
    let currentCategory: FuelCategory | null = null;
    if (dto.userVehicleId) {
      const uv = await this.vehicleRepo.findOne({
        where: { id: dto.userVehicleId, userId },
        relations: { vehicleModel: true },
      });
      if (uv) {
        currentVehicle  = uv as VehicleWithModel;
        currentCategory = toCategory(uv.vehicleModel.fuelType);
      }
    }

    // Prix carburants — tenter l'API, fallback sur constantes
    let gasPrice    = DEFAULT_GAS_PRICE;
    let dieselPrice = DEFAULT_DIESEL_PRICE;
    try {
      const [gasStation, dieselStation] = await Promise.all([
        this.fuelPrices.findNearestStationPrice(dto.origin.lat, dto.origin.lng, FuelType.SP95_E10),
        this.fuelPrices.findNearestStationPrice(dto.origin.lat, dto.origin.lng, FuelType.DIESEL),
      ]);
      if (gasStation?.price)    gasPrice    = gasStation.price;
      if (dieselStation?.price) dieselPrice = dieselStation.price;
    } catch { /* fallback silencieux */ }

    // Prix EV
    let evPrice: number;
    if (currentCategory === 'ev' && currentVehicle) {
      const home   = Number(currentVehicle.homeElectricityPrice ?? DEFAULT_EV_HOME);
      const fast   = Number(currentVehicle.publicChargingPrice  ?? DEFAULT_EV_FAST);
      const ratio  = dto.chargingMode === 'home'   ? 1
                   : dto.chargingMode === 'public' ? 0
                   : Number(currentVehicle.homeChargingRatio ?? (1 - DEFAULT_FAST_SHARE));
      evPrice = home * ratio + fast * (1 - ratio);
    } else {
      // Valeurs indicatives moyennes FR 2026
      evPrice = DEFAULT_EV_HOME * (1 - DEFAULT_FAST_SHARE) + DEFAULT_EV_FAST * DEFAULT_FAST_SHARE;
    }

    const buildComparison = (
      category:    FuelCategory,
      label:       string,
      consumption: number,
      unit:        'L' | 'kWh',
      unitPrice:   number,
    ): EnergyComparison => {
      const isCurrent = currentCategory === category;
      const totalCost = round2((distanceKm / 100) * consumption * unitPrice);
      return {
        category,
        label:           isCurrent ? `${label} (actuel)` : label,
        isCurrent,
        consumption,
        consumptionUnit: unit,
        unitPrice:       round4(unitPrice),
        totalCost,
        costPerKm:       round4(totalCost / distanceKm),
        costPerPerson:   round2(totalCost / passengers),
      };
    };

    const gasConsumption    = currentCategory === 'gas'    && currentVehicle
      ? Number(currentVehicle.vehicleModel.consumption)
      : DEFAULT_GAS_CONSUMPTION;
    const dieselConsumption = currentCategory === 'diesel' && currentVehicle
      ? Number(currentVehicle.vehicleModel.consumption)
      : DEFAULT_DIESEL_CONSUMPTION;
    const evConsumption     = currentCategory === 'ev'     && currentVehicle
      ? Number(currentVehicle.vehicleModel.consumption)
      : DEFAULT_EV_CONSUMPTION;

    const comparisons: EnergyComparison[] = [
      buildComparison('gas',    'Essence',    gasConsumption,    'L',   gasPrice),
      buildComparison('diesel', 'Diesel',     dieselConsumption, 'L',   dieselPrice),
      buildComparison('ev',     'Électrique', evConsumption,     'kWh', evPrice),
    ];

    // Recalculer avec la vraie consommation pour la catégorie courante
    const currentIdx = comparisons.findIndex((c) => c.isCurrent);
    if (currentIdx >= 0 && currentVehicle) {
      const c    = comparisons[currentIdx];
      const real = round2((distanceKm / 100) * c.consumption * c.unitPrice);
      comparisons[currentIdx] = {
        ...c,
        totalCost:     real,
        costPerKm:     round4(real / distanceKm),
        costPerPerson: round2(real / passengers),
      };
    }

    return {
      distance:   { meters: directions.distanceMeters, km: distanceKm },
      duration:   { seconds: directions.durationSeconds, formatted: this.formatDuration(directions.durationSeconds) },
      geometry:   directions.geometry,
      waypoints:  directions.waypoints,
      comparisons,
      disclaimer: currentCategory === 'ev' ? ELECTRIC_DISCLAIMER : undefined,
    };
  }

  // ── Private helpers (existing) ──────────────────────────────────────────────

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

    const homePrice   = Number(uv.homeElectricityPrice ?? 0);
    const publicPrice = Number(uv.publicChargingPrice  ?? 0);

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

  /**
   * Calcule le coût des péages.
   * - Si TOLLGURU_API_KEY est configuré : appel TollGuru (résultat précis, isEstimate=false).
   * - Sinon : estimation heuristique française basée sur la vitesse moyenne (isEstimate=true).
   * Retourne null uniquement si la route est trop courte ou lente pour avoir des péages.
   */
  private async computeTollCost(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    distanceKm: number,
    durationSeconds: number,
  ): Promise<{ cost: number; isEstimate: boolean } | null> {
    const apiKey = this.config.get<string>('TOLLGURU_API_KEY');

    if (apiKey) {
      try {
        const response = await fetch(
          'https://apis.tollguru.com/toll/v2/origin-destination-waypoints',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify({
              vehicle: { type: '2AxlesAuto' },
              origin: { lat: origin.lat, lng: origin.lng },
              destination: { lat: destination.lat, lng: destination.lng },
              currency: 'EUR',
            }),
            signal: AbortSignal.timeout(8000),
          },
        );

        if (response.ok) {
          const data = await response.json() as {
            summary?: { costs?: { cash?: number; tag?: number } };
          };
          const cost = data.summary?.costs?.cash ?? data.summary?.costs?.tag ?? null;
          if (cost !== null) return { cost: round2(cost), isEstimate: false };
        }
      } catch {
        // fall through to heuristic
      }
    }

    // Estimation heuristique France : basée sur la vitesse moyenne
    const estimated = this.estimateFrenchTolls(distanceKm, durationSeconds);
    if (estimated === null) return null;
    return { cost: estimated, isEstimate: true };
  }

  /**
   * Estimation heuristique du coût de péage pour un trajet France.
   * Basée sur la vitesse moyenne comme proxy de l'usage de l'autoroute.
   *
   * Taux moyen France : ~0,09 €/km sur autoroute.
   */
  private estimateFrenchTolls(distanceKm: number, durationSeconds: number): number | null {
    if (durationSeconds === 0 || distanceKm < 5) return null;

    const avgSpeedKmh = distanceKm / (durationSeconds / 3600);

    let tollFraction: number;
    if (avgSpeedKmh >= 95) {
      tollFraction = 0.70; // Itinéraire principalement autoroutier
    } else if (avgSpeedKmh >= 80) {
      tollFraction = 0.45; // Mix voie rapide / nationale
    } else if (avgSpeedKmh >= 65) {
      tollFraction = 0.20; // Trajet mixte, quelques tronçons payants
    } else {
      return 0; // Vitesse trop basse — route urbaine ou rurale sans péage
    }

    const TOLL_RATE_PER_KM = 0.09; // €/km moyen France
    return round2(distanceKm * tollFraction * TOLL_RATE_PER_KM);
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
}
