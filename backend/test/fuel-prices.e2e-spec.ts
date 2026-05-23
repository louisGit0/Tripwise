/**
 * Tests e2e du module FuelPrices.
 *
 * FuelPricesService est entièrement mocké : aucun appel réseau réel.
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

import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { VehiclesModule } from '../src/vehicles/vehicles.module';
import { FuelPricesModule } from '../src/fuel-prices/fuel-prices.module';
import { FuelPricesService } from '../src/fuel-prices/fuel-prices.service';
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel } from '../src/vehicles/entities/vehicle-model.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { Trip } from '../src/trips/entities/trip.entity';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';
import { AppleStrategy } from '../src/auth/strategies/apple.strategy';
import { FuelType } from '../src/vehicles/entities/vehicle-model.entity';

// ── Stubs OAuth ────────────────────────────────────────────────────────────

class GoogleStrategyMock extends PassportStrategy(Strategy, 'google') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}
class AppleStrategyMock extends PassportStrategy(Strategy, 'apple') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

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

// ── Helper ─────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('FuelPrices (e2e)', () => {
  let app: INestApplication<App>;

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
        AuthModule,
        UsersModule,
        VehiclesModule,
        FuelPricesModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
      .overrideProvider(FuelPricesService).useValue(fuelPricesMock)
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
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    fuelPricesMock.findNearestStationPrice.mockResolvedValue(ORIGIN_STATION);
    fuelPricesMock.averagePriceBetweenPoints.mockResolvedValue({
      price: 1.754,
      originStation: ORIGIN_STATION,
      destinationStation: DEST_STATION,
    });
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('Auth requise', () => {
    it('GET /fuel-prices/nearest sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=48.85&lng=2.35&fuelType=SP95_E10')
        .expect(401);
    });
  });

  // ── GET /fuel-prices/nearest ───────────────────────────────────────────────

  describe('GET /api/v1/fuel-prices/nearest', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'fuel@test.com'); });

    it('retourne la station la plus proche', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=48.8566&lng=2.3522&fuelType=SP95_E10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        stationName: 'Total Paris',
        price: 1.749,
        source: 'api',
      });
      expect(fuelPricesMock.findNearestStationPrice).toHaveBeenCalledWith(
        48.8566, 2.3522, FuelType.SP95_E10,
      );
    });

    it('appelle le service avec DIESEL', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=43.2965&lng=5.3698&fuelType=DIESEL')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(fuelPricesMock.findNearestStationPrice).toHaveBeenCalledWith(
        43.2965, 5.3698, FuelType.DIESEL,
      );
    });

    it('rejette fuelType=ELECTRIC → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=48.85&lng=2.35&fuelType=ELECTRIC')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette lat manquante → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lng=2.35&fuelType=SP95')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette lat > 90 → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=999&lng=2.35&fuelType=SP95')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette fuelType invalide → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fuel-prices/nearest?lat=48.85&lng=2.35&fuelType=GASOLINE')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});
