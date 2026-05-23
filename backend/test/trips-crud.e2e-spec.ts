/**
 * Tests e2e pour les nouvelles routes CRUD de trips.
 *
 * Couvre : POST /trips/save, GET /trips/history, GET /trips/stats,
 *          GET /trips/:id, PATCH /trips/:id, DELETE /trips/:id
 *
 * MapboxService, FuelPricesService et ChargingStationsService sont mockés.
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

// ── Service mocks ──────────────────────────────────────────────────────────

const DIRECTIONS_STUB = {
  distanceMeters: 450_000,
  durationSeconds: 14_400,
  geometry: {
    type: 'LineString' as const,
    coordinates: [[2.3522, 48.8566], [5.3698, 43.2965]] as [number, number][],
  },
  waypoints: [
    { name: 'Paris',     location: [2.3522, 48.8566] as [number, number] },
    { name: 'Marseille', location: [5.3698, 43.2965] as [number, number] },
  ],
};

const ORIGIN_STATION = {
  stationName: 'Total Paris',
  address: '1 rue de Rivoli, Paris',
  price: 1.749,
  lastUpdate: '2024-01-01T00:00:00.000Z',
  distanceKm: 0.3,
  source: 'api' as const,
};

const mapboxMock = {
  geocode: jest.fn().mockResolvedValue([]),
  getDirections: jest.fn().mockResolvedValue(DIRECTIONS_STUB),
};

const fuelPricesMock = {
  findNearestStationPrice: jest.fn().mockResolvedValue(ORIGIN_STATION),
  averagePriceBetweenPoints: jest.fn().mockResolvedValue({
    price: 1.754,
    originStation: ORIGIN_STATION,
    destinationStation: ORIGIN_STATION,
  }),
};

const chargingMock = {
  findStationsNearPoint:  jest.fn().mockResolvedValue([]),
  findStationsAlongRoute: jest.fn().mockResolvedValue([]),
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Shared save DTO ────────────────────────────────────────────────────────

function buildSaveDto(vehicleId: string) {
  return {
    userVehicleId:  vehicleId,
    origin:         { lat: 48.8566, lng: 2.3522, label: 'Paris' },
    destination:    { lat: 43.2965, lng: 5.3698, label: 'Marseille' },
    distanceMeters: 450_000,
    durationSeconds: 14_400,
    fuelType:       'SP95_E10',
    energyAmount:   24.3,
    energyUnit:     'L',
    unitPrice:      1.754,
    energyCost:     42.62,
    totalCost:      42.62,
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('Trips CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let modelRepo: Repository<VehicleModel>;
  let thermalModelId: string;

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
    thermalModelId = thermal.id;
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    mapboxMock.getDirections.mockResolvedValue(DIRECTIONS_STUB);
    fuelPricesMock.findNearestStationPrice.mockResolvedValue(ORIGIN_STATION);
    fuelPricesMock.averagePriceBetweenPoints.mockResolvedValue({
      price: 1.754,
      originStation: ORIGIN_STATION,
      destinationStation: ORIGIN_STATION,
    });
  });

  // ── POST /trips/save ───────────────────────────────────────────────────────

  describe('POST /api/v1/trips/save', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'save-trip@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId, nickname: 'SaveClio' });
      vehicleId = r.body.id as string;
    });

    it('crée un trajet (201) et retourne l\'entité', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSaveDto(vehicleId))
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.distanceKm).toBeCloseTo(450, 0);
      expect(res.body.fuelType).toBe('SP95_E10');
      expect(res.body.isArchived).toBe(false);
    });

    it('accepte les champs optionnels note et passengersCount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...buildSaveDto(vehicleId), note: 'Vacances', passengersCount: 3 })
        .expect(201);

      expect(res.body.note).toBe('Vacances');
      expect(res.body.passengersCount).toBe(3);
    });

    it('retourne 403 pour un vehicleId appartenant à un autre user', async () => {
      const otherToken = await registerAndLogin(app, 'save-trip-other@test.com');
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(buildSaveDto(vehicleId))
        .expect(403);
    });

    it('retourne 400 si distanceMeters est absent', async () => {
      const { distanceMeters: _d, ...rest } = buildSaveDto(vehicleId);
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(rest)
        .expect(400);
    });

    it('retourne 400 si fuelType est invalide', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...buildSaveDto(vehicleId), fuelType: 'HYDROGEN' })
        .expect(400);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .send(buildSaveDto(vehicleId))
        .expect(401);
    });
  });

  // ── GET /trips/history ─────────────────────────────────────────────────────

  describe('GET /api/v1/trips/history', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'history@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;

      // Sauvegarder 2 trajets
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSaveDto(vehicleId));
      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...buildSaveDto(vehicleId), totalCost: 50.00 });
    });

    it('retourne une liste paginée', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(2);
      expect(res.body).toHaveProperty('monthlyTotals');
    });

    it('liste vide pour un utilisateur sans trajet', async () => {
      const newToken = await registerAndLogin(app, 'history-empty@test.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/history')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('filtre par fuelCategory=gas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/history?fuelCategory=gas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
    });

    it('filtre par fuelCategory=ev retourne 0 trajet (pas de trajet électrique)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/history?fuelCategory=ev')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items.length).toBe(0);
    });

    it('filtre par mois valide', async () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/trips/history?month=${month}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(0);
    });

    it('retourne 400 pour un format de mois invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/history?month=2024/05')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/history')
        .expect(401);
    });
  });

  // ── GET /trips/stats ───────────────────────────────────────────────────────

  describe('GET /api/v1/trips/stats', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'stats@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;

      await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...buildSaveDto(vehicleId), totalCost: 40.00 });
    });

    it('retourne des stats agrégées avec le mois courant', async () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/trips/stats?month=${month}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('month', month);
      expect(res.body).toHaveProperty('totalCost');
      expect(res.body).toHaveProperty('totalDistance');
      expect(res.body).toHaveProperty('tripCount');
      expect(res.body).toHaveProperty('savedVsGas');
      expect(res.body).toHaveProperty('dailyExpenses');
      expect(res.body.tripCount).toBeGreaterThanOrEqual(1);
    });

    it('retourne des zéros pour un mois sans trajet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/trips/stats?month=2020-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.totalCost).toBe(0);
      expect(res.body.tripCount).toBe(0);
      expect(res.body.averageCostPerKm).toBeNull();
      expect(res.body.dailyExpenses).toHaveLength(0);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/stats')
        .expect(401);
    });
  });

  // ── GET /trips/:id ─────────────────────────────────────────────────────────

  describe('GET /api/v1/trips/:id', () => {
    let token: string;
    let vehicleId: string;
    let tripId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'get-trip@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;

      const saved = await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSaveDto(vehicleId));
      tripId = saved.body.id as string;
    });

    it('retourne le détail du trajet', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(tripId);
      expect(res.body).toHaveProperty('fuelType');
    });

    it('retourne 404 pour un id inconnu', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/trips/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('retourne 403 pour le trajet d\'un autre utilisateur', async () => {
      const otherToken = await registerAndLogin(app, 'get-trip-other@test.com');
      await request(app.getHttpServer())
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/trips/${tripId}`)
        .expect(401);
    });
  });

  // ── PATCH /trips/:id ───────────────────────────────────────────────────────

  describe('PATCH /api/v1/trips/:id', () => {
    let token: string;
    let vehicleId: string;
    let tripId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'patch-trip@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;

      const saved = await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSaveDto(vehicleId));
      tripId = saved.body.id as string;
    });

    it('met à jour note et isArchived', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Voyage pro', isArchived: true })
        .expect(200);

      expect(res.body.note).toBe('Voyage pro');
      expect(res.body.isArchived).toBe(true);
    });

    it('retourne 404 pour un id inconnu', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/trips/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'X' })
        .expect(404);
    });

    it('retourne 403 pour le trajet d\'un autre utilisateur', async () => {
      const otherToken = await registerAndLogin(app, 'patch-trip-other@test.com');
      await request(app.getHttpServer())
        .patch(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ note: 'Volé' })
        .expect(403);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/trips/${tripId}`)
        .send({ note: 'X' })
        .expect(401);
    });
  });

  // ── DELETE /trips/:id ──────────────────────────────────────────────────────

  describe('DELETE /api/v1/trips/:id', () => {
    let token: string;
    let vehicleId: string;
    let tripId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'delete-trip@test.com');
      const r = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = r.body.id as string;

      const saved = await request(app.getHttpServer())
        .post('/api/v1/trips/save')
        .set('Authorization', `Bearer ${token}`)
        .send(buildSaveDto(vehicleId));
      tripId = saved.body.id as string;
    });

    it('supprime le trajet (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('retourne 404 après suppression', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/trips/${tripId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('retourne 404 pour un id inconnu', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/trips/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/trips/${tripId}`)
        .expect(401);
    });
  });
});
