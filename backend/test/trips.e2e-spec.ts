/**
 * Tests e2e du module Trips.
 *
 * MapboxService est entièrement mocké : aucun appel réseau réel.
 * SQLite in-memory, sans PostgreSQL.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { VehiclesModule } from '../src/vehicles/vehicles.module';
import { TripsModule } from '../src/trips/trips.module';
import { MapboxModule } from '../src/mapbox/mapbox.module';
import { MapboxService } from '../src/mapbox/mapbox.service';
import { FuelPricesModule } from '../src/fuel-prices/fuel-prices.module';
import { FuelPricesService } from '../src/fuel-prices/fuel-prices.service';
import { ChargingStationsModule } from '../src/charging-stations/charging-stations.module';
import { ChargingStationsService } from '../src/charging-stations/charging-stations.service';
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel, FuelType } from '../src/vehicles/entities/vehicle-model.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { Trip } from '../src/trips/entities/trip.entity';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';
import { AppleStrategy } from '../src/auth/strategies/apple.strategy';

// ── Stubs OAuth ────────────────────────────────────────────────────────────

class GoogleStrategyMock extends PassportStrategy(Strategy, 'google') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}
class AppleStrategyMock extends PassportStrategy(Strategy, 'apple') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

// ── Mock MapboxService ─────────────────────────────────────────────────────

const GEOCODE_STUB = [
  {
    id: 'place.123',
    place_name: 'Paris, Île-de-France, France',
    center: [2.3522, 48.8566] as [number, number],
    geometry: { type: 'Point' as const, coordinates: [2.3522, 48.8566] as [number, number] },
    properties: {},
  },
];

const DIRECTIONS_STUB = {
  distanceMeters: 450_000,
  durationSeconds: 14_400,
  geometry: {
    type: 'LineString' as const,
    coordinates: [[2.3522, 48.8566], [5.3698, 43.2965]] as [number, number][],
  },
  waypoints: [
    { name: 'Paris', location: [2.3522, 48.8566] as [number, number] },
    { name: 'Marseille', location: [5.3698, 43.2965] as [number, number] },
  ],
};

const mapboxMock = {
  geocode: jest.fn().mockResolvedValue(GEOCODE_STUB),
  getDirections: jest.fn().mockResolvedValue(DIRECTIONS_STUB),
};

// ── Mock FuelPricesService ─────────────────────────────────────────────────

const ORIGIN_STATION = {
  stationName: 'Total Paris',
  address: '1 rue de Rivoli, Paris',
  price: 1.749,
  lastUpdate: '2024-01-01T00:00:00.000Z',
  distanceKm: 0.3,
  source: 'api' as const,
};

const DEST_STATION = {
  stationName: 'BP Marseille',
  address: '10 avenue du Prado, Marseille',
  price: 1.759,
  lastUpdate: '2024-01-01T00:00:00.000Z',
  distanceKm: 0.8,
  source: 'api' as const,
};

const fuelPricesMock = {
  findNearestStationPrice: jest.fn().mockResolvedValue(ORIGIN_STATION),
  averagePriceBetweenPoints: jest.fn().mockResolvedValue({
    price: 1.754,
    originStation: ORIGIN_STATION,
    destinationStation: DEST_STATION,
  }),
};

// ── Mock ChargingStationsService ───────────────────────────────────────────

const CHARGING_STATION_STUB = {
  id: 'FR*VER*E123',
  name: 'Supercharger Test',
  operator: 'Tesla',
  address: '1 rue Test, Paris',
  lat: 48.85,
  lng: 2.35,
  powerKw: 250,
  connectorTypes: ['CCS'],
  openingHours: '24/7',
  isFreeAccess: false,
  distanceKm: 0.5,
};

const chargingMock = {
  findStationsNearPoint: jest.fn().mockResolvedValue([CHARGING_STATION_STUB]),
  findStationsAlongRoute: jest.fn().mockResolvedValue([CHARGING_STATION_STUB]),
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('Trips (e2e)', () => {
  let app: INestApplication<App>;
  let modelRepo: Repository<VehicleModel>;

  let thermalModelId: string;
  let electricModelId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            app: {
              jwtSecret: 'test-jwt-secret-at-least-32-chars-long',
              nodeEnv: 'test',
              apiPrefix: 'api/v1',
              corsOrigins: [],
              mapboxToken: '',
            },
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User, UserVehicle, VehicleModel, Favorite, Trip],
          synchronize: true,
          logging: false,
        }),
        MapboxModule,
        AuthModule,
        UsersModule,
        VehiclesModule,
        FuelPricesModule,
        ChargingStationsModule,
        TripsModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
      .overrideProvider(MapboxService).useValue(mapboxMock)
      .overrideProvider(FuelPricesService).useValue(fuelPricesMock)
      .overrideProvider(ChargingStationsService).useValue(chargingMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();

    modelRepo = moduleFixture.get<Repository<VehicleModel>>(getRepositoryToken(VehicleModel));

    const thermal = await modelRepo.save(
      modelRepo.create({ brand: 'Renault', model: 'Clio V', year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.4 }),
    );
    const electric = await modelRepo.save(
      modelRepo.create({ brand: 'Tesla', model: 'Model 3', year: 2023, fuelType: FuelType.ELECTRIC, consumption: 14.9 }),
    );
    thermalModelId = thermal.id;
    electricModelId = electric.id;
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    mapboxMock.geocode.mockResolvedValue(GEOCODE_STUB);
    mapboxMock.getDirections.mockResolvedValue(DIRECTIONS_STUB);
    fuelPricesMock.findNearestStationPrice.mockResolvedValue(ORIGIN_STATION);
    fuelPricesMock.averagePriceBetweenPoints.mockResolvedValue({
      price: 1.754,
      originStation: ORIGIN_STATION,
      destinationStation: DEST_STATION,
    });
    chargingMock.findStationsNearPoint.mockResolvedValue([CHARGING_STATION_STUB]);
    chargingMock.findStationsAlongRoute.mockResolvedValue([CHARGING_STATION_STUB]);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('Auth requise sur tous les endpoints', () => {
    it('GET /trips/geocode sans token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/trips/geocode?q=Paris').expect(401);
    });
    it('POST /trips/calculate sans token → 401', async () => {
      await request(app.getHttpServer()).post('/api/v1/trips/calculate').expect(401);
    });
  });

  // ── Geocode ────────────────────────────────────────────────────────────────

  describe('GET /api/v1/trips/geocode', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'trips-geo@test.com'); });

    it('retourne les suggestions pour une requête valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/geocode?q=Paris')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('place_name');
      expect(mapboxMock.geocode).toHaveBeenCalledWith('Paris', expect.objectContaining({}));
    });

    it('transmet les paramètres country et limit', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/geocode?q=Lyon&country=fr&limit=3')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mapboxMock.geocode).toHaveBeenCalledWith('Lyon', { country: 'fr', limit: 3 });
    });

    it('rejette q trop court → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/geocode?q=P')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette limit > 10 → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/geocode?q=Paris&limit=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  // ── Calculate ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/trips/calculate', () => {
    let token: string;
    let thermalVehicleId: string;
    let electricVehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'trips-calc@test.com');

      // Ajouter un véhicule thermique
      const r1 = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId, nickname: 'Clio' });
      thermalVehicleId = r1.body.id as string;

      // Ajouter un véhicule électrique
      const r2 = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: electricModelId, nickname: 'Tesla', homeElectricityPrice: 0.2272, publicChargingPrice: 0.45 });
      electricVehicleId = r2.body.id as string;
    });

    const BASE_BODY = {
      origin: { lat: 48.8566, lng: 2.3522, label: 'Paris' },
      destination: { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
    };

    it('retourne distance, durée, géométrie et véhicule (thermique)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(201);

      expect(res.body.distance).toMatchObject({ meters: 450_000, km: 450 });
      expect(res.body.duration).toMatchObject({ seconds: 14_400, formatted: '4h' });
      expect(res.body.geometry.type).toBe('LineString');
      expect(res.body.vehicle).toMatchObject({
        brand: 'Renault',
        model: 'Clio V',
        fuelType: 'SP95_E10',
        consumption: 5.4,
      });
      // Véhicule thermique → cost présent
      expect(res.body).toHaveProperty('cost');
      expect(res.body.cost).toMatchObject({
        type: 'fuel',
        fuelType: 'SP95_E10',
      });
    });

    it('retourne cost.type=electric pour un véhicule électrique (mode home par défaut)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId })
        .expect(201);

      expect(res.body.vehicle).toMatchObject({ brand: 'Tesla', fuelType: 'ELECTRIC' });
      expect(res.body.cost).toMatchObject({
        type: 'electric',
        chargingMode: 'home',
      });
      expect(res.body.cost.disclaimer).toBeTruthy();
    });

    it('calcule correctement le coût électrique (mode home)', async () => {
      // 450 km × 14.9 kWh/100km = 67.05 kWh ; 67.05 × 0.2272 ≈ 15.23 €
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId, chargingMode: 'home' })
        .expect(201);

      expect(res.body.cost.consumptionKwh).toBeCloseTo(67.05, 1);
      expect(res.body.cost.pricePerKwh).toBeCloseTo(0.2272, 3);
      expect(res.body.cost.totalCost).toBeCloseTo(15.23, 0);
    });

    it('calcule correctement le coût électrique (mode public)', async () => {
      // 450 km × 14.9 kWh/100km = 67.05 kWh ; 67.05 × 0.45 ≈ 30.17 €
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId, chargingMode: 'public' })
        .expect(201);

      expect(res.body.cost.pricePerKwh).toBeCloseTo(0.45, 2);
      expect(res.body.cost.totalCost).toBeCloseTo(30.17, 0);
    });

    it('calcule correctement le coût électrique (mode mix 50/50)', async () => {
      // prix moyen = (0.2272 + 0.45) / 2 = 0.3386 €/kWh
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId, chargingMode: 'mix', chargingMixRatio: 0.5 })
        .expect(201);

      expect(res.body.cost.chargingMode).toBe('mix');
      expect(res.body.cost.pricePerKwh).toBeCloseTo(0.3386, 3);
    });

    it('inclut les bornes proches dans le coût électrique', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId })
        .expect(201);

      expect(Array.isArray(res.body.cost.nearbyStations)).toBe(true);
      expect(res.body.cost.nearbyStations[0]).toMatchObject({ id: 'FR*VER*E123' });
      expect(chargingMock.findStationsAlongRoute).toHaveBeenCalled();
    });

    it('rejette chargingMode invalide → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId, chargingMode: 'invalid' })
        .expect(400);
    });

    it('retourne cost avec consumptionLitres et totalCost corrects (thermique)', async () => {
      // 450 km × 5.4 L/100km = 24.3 L ; 24.3 × 1.754 ≈ 42.62 €
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(201);

      expect(res.body.cost.consumptionLitres).toBeCloseTo(24.3, 1);
      expect(res.body.cost.pricePerLitre).toBeCloseTo(1.754, 2);
      expect(res.body.cost.totalCost).toBeCloseTo(42.62, 0);
      expect(res.body.cost.priceSource).toMatchObject({
        originStation: { stationName: 'Total Paris', source: 'api' },
        destinationStation: { stationName: 'BP Marseille', source: 'api' },
        source: 'api',
      });
    });

    it('source = fallback quand FuelPricesService retourne fallback', async () => {
      const fallbackStation = { ...ORIGIN_STATION, source: 'fallback' as const };
      fuelPricesMock.averagePriceBetweenPoints.mockResolvedValueOnce({
        price: 1.72,
        originStation: fallbackStation,
        destinationStation: fallbackStation,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(201);

      expect(res.body.cost.priceSource.source).toBe('fallback');
    });

    it('formate correctement la durée (ex: 14400s → "4h")', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(201);

      expect(res.body.duration.formatted).toBe('4h');
    });

    it('appelle MapboxService.getDirections avec les bonnes coordonnées', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId });

      expect(mapboxMock.getDirections).toHaveBeenCalledWith(
        { lat: 48.8566, lng: 2.3522, label: 'Paris' },
        { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
      );
    });

    it('retourne 404 pour un vehicleId inconnu de l\'utilisateur', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('refuse un vehicleId appartenant à un autre user → 404', async () => {
      const otherToken = await registerAndLogin(app, 'trips-calc-other@test.com');
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(404);
    });

    it('rejette des coordonnées invalides (lat > 90) → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, origin: { lat: 999, lng: 2.35 }, userVehicleId: thermalVehicleId })
        .expect(400);
    });

    it('rejette un body sans origin → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ destination: BASE_BODY.destination, userVehicleId: thermalVehicleId })
        .expect(400);
    });

    it('propage une ServiceUnavailableException si Mapbox est indisponible', async () => {
      mapboxMock.getDirections.mockRejectedValueOnce(
        Object.assign(new Error('Mapbox down'), { status: 503 }),
      );
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect((res) => {
          expect([500, 503]).toContain(res.status);
        });
    });
  });

  // ── formatDuration ─────────────────────────────────────────────────────────

  describe('formatDuration (via calculate)', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'trips-fmt@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;
    });

    const cases: Array<[number, string]> = [
      [45 * 60, '45min'],
      [3600, '1h'],
      [5400, '1h30'],
      [7380, '2h03'],
    ];

    test.each(cases)('%d s → "%s"', async (seconds, expected) => {
      mapboxMock.getDirections.mockResolvedValueOnce({ ...DIRECTIONS_STUB, durationSeconds: seconds });
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 43.2965, lng: 5.3698 },
          userVehicleId: vehicleId,
        });
      expect(res.body.duration?.formatted).toBe(expected);
    });
  });

  // ── POST /trips/calculate-multi ─────────────────────────────────────────────

  describe('POST /api/v1/trips/calculate-multi', () => {
    let token: string;
    let thermalVehicleId: string;
    let electricVehicleId: string;

    const BASE_BODY = {
      origin:      { lat: 48.8566, lng: 2.3522, label: 'Paris' },
      destination: { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
    };

    beforeAll(async () => {
      token = await registerAndLogin(app, 'trips-multi@test.com');

      const r1 = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId, nickname: 'Multi-Clio' });
      thermalVehicleId = r1.body.id as string;

      const r2 = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleModelId: electricModelId,
          nickname: 'Multi-Tesla',
          homeElectricityPrice: 0.21,
          publicChargingPrice:  0.49,
        });
      electricVehicleId = r2.body.id as string;
    });

    it('retourne 3 comparaisons avec userVehicleId thermique — isCurrent sur "gas"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate-multi')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: thermalVehicleId })
        .expect(201);

      expect(Array.isArray(res.body.comparisons)).toBe(true);
      expect(res.body.comparisons).toHaveLength(3);

      const currentEntry = res.body.comparisons.find(
        (c: { isCurrent: boolean }) => c.isCurrent === true,
      );
      expect(currentEntry).toBeDefined();
      expect(currentEntry.category).toBe('gas');
      expect(currentEntry.label).toContain('(actuel)');
    });

    it('retourne 3 comparaisons sans userVehicleId — tous isCurrent: false', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate-multi')
        .set('Authorization', `Bearer ${token}`)
        .send(BASE_BODY)
        .expect(201);

      expect(res.body.comparisons).toHaveLength(3);
      expect(res.body.comparisons.every((c: { isCurrent: boolean }) => !c.isCurrent)).toBe(true);
    });

    it('isCurrent = ev pour un véhicule électrique', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/calculate-multi')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...BASE_BODY, userVehicleId: electricVehicleId })
        .expect(201);

      const currentEntry = res.body.comparisons.find(
        (c: { isCurrent: boolean }) => c.isCurrent === true,
      );
      expect(currentEntry).toBeDefined();
      expect(currentEntry.category).toBe('ev');
      expect(res.body.disclaimer).toBeTruthy();
    });

    it('rejette un body sans origin → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate-multi')
        .set('Authorization', `Bearer ${token}`)
        .send({ destination: BASE_BODY.destination })
        .expect(400);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/calculate-multi')
        .send(BASE_BODY)
        .expect(401);
    });
  });
});
