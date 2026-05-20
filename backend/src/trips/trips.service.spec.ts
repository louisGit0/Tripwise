/**
 * Tests unitaires — TripsService
 *
 * On teste le cœur du calcul de coût sans appel réseau ni base de données.
 * Les dépendances externes (MapboxService, VehiclesService, FuelPricesService,
 * ChargingStationsService) sont entièrement mockées.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { MapboxService } from '../mapbox/mapbox.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { FuelPricesService } from '../fuel-prices/fuel-prices.service';
import { ChargingStationsService } from '../charging-stations/charging-stations.service';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';

// ── Stubs ──────────────────────────────────────────────────────────────────────

const DIRECTIONS_STUB = {
  distanceMeters: 450_000,
  durationSeconds: 14_400,
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [2.3522, 48.8566],
      [5.3698, 43.2965],
    ] as [number, number][],
  },
  waypoints: [
    { name: 'Paris', location: [2.3522, 48.8566] as [number, number] },
    { name: 'Marseille', location: [5.3698, 43.2965] as [number, number] },
  ],
};

const FUEL_STATION_STUB = {
  stationName: 'Total Test',
  address: '1 rue Test, Paris',
  price: 1.75,
  lastUpdate: new Date().toISOString(),
  distanceKm: 0.5,
  source: 'api' as const,
};

const makeVehicle = (overrides: Partial<{
  fuelType: FuelType;
  consumption: number;
  homeElectricityPrice: number;
  publicChargingPrice: number;
}> = {}) => ({
  id: 'uv-1',
  nickname: null,
  homeElectricityPrice: overrides.homeElectricityPrice ?? null,
  publicChargingPrice: overrides.publicChargingPrice ?? null,
  vehicleModel: {
    id: 'vm-1',
    brand: 'Peugeot',
    model: '308',
    fuelType: overrides.fuelType ?? FuelType.SP95,
    consumption: overrides.consumption ?? 6.5,
    consumptionPer100km: overrides.consumption ?? 6.5,
  },
});

// ── Setup ──────────────────────────────────────────────────────────────────────

describe('TripsService', () => {
  let service: TripsService;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let fuelPricesService: jest.Mocked<FuelPricesService>;
  let chargingStationsService: jest.Mocked<ChargingStationsService>;
  let mapboxService: jest.Mocked<MapboxService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: MapboxService,
          useValue: {
            geocode: jest.fn(),
            getDirections: jest.fn().mockResolvedValue(DIRECTIONS_STUB),
          },
        },
        {
          provide: VehiclesService,
          useValue: { findUserVehicles: jest.fn() },
        },
        {
          provide: FuelPricesService,
          useValue: { averagePriceBetweenPoints: jest.fn() },
        },
        {
          provide: ChargingStationsService,
          useValue: { findStationsAlongRoute: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(TripsService);
    vehiclesService = module.get(VehiclesService) as jest.Mocked<VehiclesService>;
    fuelPricesService = module.get(FuelPricesService) as jest.Mocked<FuelPricesService>;
    chargingStationsService = module.get(ChargingStationsService) as jest.Mocked<ChargingStationsService>;
    mapboxService = module.get(MapboxService) as jest.Mocked<MapboxService>;
  });

  // ── Vérification du véhicule ────────────────────────────────────────────────

  describe('calculate — vehicle lookup', () => {
    it('throws NotFoundException when vehicle does not belong to user', async () => {
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle()] as any);

      await expect(
        service.calculate('user-1', {
          origin: { lat: 48.8566, lng: 2.3522, label: 'Paris' },
          destination: { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
          userVehicleId: 'other-vehicle-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Calcul du coût carburant ────────────────────────────────────────────────

  describe('computeFuelCost', () => {
    const origin = { lat: 48.8566, lng: 2.3522, label: 'Paris' };
    const destination = { lat: 43.2965, lng: 5.3698, label: 'Marseille' };
    const dto = { origin, destination, userVehicleId: 'uv-1' };

    beforeEach(() => {
      fuelPricesService.averagePriceBetweenPoints.mockResolvedValue({
        price: 1.75,
        originStation: FUEL_STATION_STUB,
        destinationStation: FUEL_STATION_STUB,
      });
    });

    it('calculates correct fuel consumption for SP95', async () => {
      // 450 km × 6.5 L/100 km = 29.25 L
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.SP95, consumption: 6.5 })] as any);

      const result = await service.calculate('user-1', dto);

      expect(result.cost).toBeDefined();
      expect(result.cost!.type).toBe('fuel');
      const cost = result.cost as any;
      expect(cost.consumptionLitres).toBeCloseTo(29.25, 1);
    });

    it('calculates correct total cost for fuel trip', async () => {
      // 450 km × 6.5 L/100 = 29.25 L × 1.75 €/L = 51.19 €
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.SP95, consumption: 6.5 })] as any);

      const result = await service.calculate('user-1', dto);
      const cost = result.cost as any;

      expect(cost.totalCost).toBeCloseTo(51.19, 1);
      expect(cost.pricePerLitre).toBe(1.75);
    });

    it('includes priceSource with origin and destination stations', async () => {
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.DIESEL, consumption: 5.0 })] as any);
      fuelPricesService.averagePriceBetweenPoints.mockResolvedValue({
        price: 1.68,
        originStation: { ...FUEL_STATION_STUB, source: 'api' },
        destinationStation: { ...FUEL_STATION_STUB, source: 'api' },
      });

      const result = await service.calculate('user-1', dto);
      const cost = result.cost as any;

      expect(cost.priceSource.source).toBe('api');
      expect(cost.priceSource.originStation).toBeDefined();
      expect(cost.priceSource.destinationStation).toBeDefined();
    });

    it('marks source as fallback when at least one station uses fallback', async () => {
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.SP95 })] as any);
      fuelPricesService.averagePriceBetweenPoints.mockResolvedValue({
        price: 1.75,
        originStation: { ...FUEL_STATION_STUB, source: 'fallback' },
        destinationStation: { ...FUEL_STATION_STUB, source: 'api' },
      });

      const result = await service.calculate('user-1', dto);
      const cost = result.cost as any;
      expect(cost.priceSource.source).toBe('fallback');
    });

    it('rounds consumption to 2 decimal places', async () => {
      // 450 km × 7.3 L/100 = 32.85 L (exact) → arrondi 2 décimales
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle({ fuelType: FuelType.DIESEL, consumption: 7.3 })] as any);

      const result = await service.calculate('user-1', dto);
      const cost = result.cost as any;

      const decimals = cost.consumptionLitres.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  // ── Calcul du coût électrique ───────────────────────────────────────────────

  describe('computeElectricCost', () => {
    const origin = { lat: 48.8566, lng: 2.3522, label: 'Paris' };
    const destination = { lat: 43.2965, lng: 5.3698, label: 'Marseille' };
    const electricVehicle = makeVehicle({
      fuelType: FuelType.ELECTRIC,
      consumption: 15.0, // 15 kWh/100 km
      homeElectricityPrice: 0.2276,
      publicChargingPrice: 0.45,
    });

    beforeEach(() => {
      vehiclesService.findUserVehicles.mockResolvedValue([electricVehicle] as any);
    });

    it('calculates correct energy consumption', async () => {
      // 450 km × 15 kWh/100 km = 67.5 kWh
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
      });
      const cost = result.cost as any;
      expect(cost.type).toBe('electric');
      expect(cost.consumptionKwh).toBeCloseTo(67.5, 1);
    });

    it('uses home electricity price in home mode', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1', chargingMode: 'home',
      });
      const cost = result.cost as any;
      // 67.5 kWh × 0.2276 = 15.36 €
      expect(cost.pricePerKwh).toBeCloseTo(0.2276, 4);
      expect(cost.totalCost).toBeCloseTo(67.5 * 0.2276, 1);
    });

    it('uses public charging price in public mode', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1', chargingMode: 'public',
      });
      const cost = result.cost as any;
      expect(cost.pricePerKwh).toBeCloseTo(0.45, 4);
      expect(cost.chargingMode).toBe('public');
    });

    it('blends home and public price in mix mode (50/50 default)', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
        chargingMode: 'mix',
        chargingMixRatio: 0.5,
      });
      const cost = result.cost as any;
      // 0.2276 × 0.5 + 0.45 × 0.5 = 0.3388
      const expectedPrice = 0.2276 * 0.5 + 0.45 * 0.5;
      expect(cost.pricePerKwh).toBeCloseTo(expectedPrice, 3);
    });

    it('respects custom mix ratio', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
        chargingMode: 'mix',
        chargingMixRatio: 0.8,
      });
      const cost = result.cost as any;
      // 0.2276 × 0.8 + 0.45 × 0.2 = 0.2721
      const expectedPrice = 0.2276 * 0.8 + 0.45 * 0.2;
      expect(cost.pricePerKwh).toBeCloseTo(expectedPrice, 3);
    });

    it('defaults to home mode when chargingMode is omitted', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
      });
      const cost = result.cost as any;
      expect(cost.chargingMode).toBe('home');
      expect(cost.pricePerKwh).toBeCloseTo(0.2276, 4);
    });

    it('includes disclaimer text', async () => {
      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
      });
      const cost = result.cost as any;
      expect(cost.disclaimer).toBeTruthy();
      expect(typeof cost.disclaimer).toBe('string');
    });

    it('slices nearby stations to max 20', async () => {
      const manyStations = Array.from({ length: 35 }, (_, i) => ({ id: `s${i}` }));
      chargingStationsService.findStationsAlongRoute.mockResolvedValue(manyStations as any);

      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
      });
      const cost = result.cost as any;
      expect(cost.nearbyStations.length).toBeLessThanOrEqual(20);
    });
  });

  // ── formatDuration ──────────────────────────────────────────────────────────

  describe('duration formatting', () => {
    const origin = { lat: 48.8566, lng: 2.3522, label: 'Paris' };
    const destination = { lat: 43.2965, lng: 5.3698, label: 'Marseille' };

    beforeEach(() => {
      vehiclesService.findUserVehicles.mockResolvedValue([makeVehicle()] as any);
      fuelPricesService.averagePriceBetweenPoints.mockResolvedValue({
        price: 1.75,
        originStation: FUEL_STATION_STUB,
        destinationStation: FUEL_STATION_STUB,
      });
    });

    it.each([
      [3600, '1h'],
      [5400, '1h30'],
      [1800, '30min'],
      [0, '0min'],
      [7320, '2h02'],
    ])('formats %ds as "%s"', async (durationSeconds, expected) => {
      mapboxService.getDirections.mockResolvedValue({
        ...DIRECTIONS_STUB,
        durationSeconds,
      });

      const result = await service.calculate('user-1', {
        origin, destination, userVehicleId: 'uv-1',
      });
      expect(result.duration.formatted).toBe(expected);
    });
  });
});
