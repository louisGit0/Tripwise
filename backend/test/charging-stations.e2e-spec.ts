/**
 * Tests e2e du module ChargingStations.
 *
 * ChargingStationsService est entièrement mocké : aucun appel réseau réel.
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
import { ChargingStationsModule } from '../src/charging-stations/charging-stations.module';
import { ChargingStationsService } from '../src/charging-stations/charging-stations.service';
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel } from '../src/vehicles/entities/vehicle-model.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
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

// ── Mock ChargingStationsService ───────────────────────────────────────────

const STATION_STUB = {
  id: 'FR*VER*E123',
  name: 'Supercharger Paris Gare de Lyon',
  operator: 'Tesla',
  address: '20 Bd Diderot, Paris',
  lat: 48.8448,
  lng: 2.3737,
  powerKw: 250,
  connectorTypes: ['CCS'],
  openingHours: '24/7',
  isFreeAccess: false,
  distanceKm: 1.2,
};

const chargingMock = {
  findStationsNearPoint: jest.fn().mockResolvedValue([STATION_STUB]),
  findStationsAlongRoute: jest.fn().mockResolvedValue([STATION_STUB]),
};

// ── Helper ─────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('ChargingStations (e2e)', () => {
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
          entities: [User, UserVehicle, VehicleModel, Favorite],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        UsersModule,
        ChargingStationsModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
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
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    chargingMock.findStationsNearPoint.mockResolvedValue([STATION_STUB]);
    chargingMock.findStationsAlongRoute.mockResolvedValue([STATION_STUB]);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('Auth requise', () => {
    it('GET /charging-stations/nearby sans token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lat=48.85&lng=2.35')
        .expect(401);
    });
    it('POST /charging-stations/along-route sans token → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .expect(401);
    });
  });

  // ── GET /charging-stations/nearby ──────────────────────────────────────────

  describe('GET /api/v1/charging-stations/nearby', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'stations-nearby@test.com'); });

    it('retourne les bornes proches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lat=48.8566&lng=2.3522')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toMatchObject({
        id: 'FR*VER*E123',
        name: 'Supercharger Paris Gare de Lyon',
        powerKw: 250,
      });
      expect(chargingMock.findStationsNearPoint).toHaveBeenCalledWith(
        48.8566, 2.3522, undefined,
      );
    });

    it('transmet le paramètre radius', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lat=43.2965&lng=5.3698&radius=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(chargingMock.findStationsNearPoint).toHaveBeenCalledWith(43.2965, 5.3698, 10);
    });

    it('rejette lat manquante → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lng=2.35')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette lat > 90 → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lat=999&lng=2.35')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('rejette radius > 50 → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/charging-stations/nearby?lat=48.85&lng=2.35&radius=99')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  // ── POST /charging-stations/along-route ────────────────────────────────────

  describe('POST /api/v1/charging-stations/along-route', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'stations-route@test.com'); });

    const ROUTE_BODY = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [5.3698, 43.2965],
        ],
      },
    };

    it('retourne les bornes le long du trajet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .set('Authorization', `Bearer ${token}`)
        .send(ROUTE_BODY)
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toMatchObject({ id: 'FR*VER*E123' });
      expect(chargingMock.findStationsAlongRoute).toHaveBeenCalledWith(
        ROUTE_BODY.geometry, undefined,
      );
    });

    it('transmet maxDistanceMeters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...ROUTE_BODY, maxDistanceMeters: 3000 })
        .expect(201);

      expect(chargingMock.findStationsAlongRoute).toHaveBeenCalledWith(
        ROUTE_BODY.geometry, 3000,
      );
    });

    it('rejette geometry absente → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('rejette geometry de mauvais type → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .set('Authorization', `Bearer ${token}`)
        .send({ geometry: { type: 'Point', coordinates: [2.35, 48.85] } })
        .expect(400);
    });

    it('rejette maxDistanceMeters > 10000 → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/charging-stations/along-route')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...ROUTE_BODY, maxDistanceMeters: 99_999 })
        .expect(400);
    });
  });
});
