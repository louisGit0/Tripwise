/**
 * Tests e2e du module Prices.
 *
 * GET /prices/defaults — retourne les prix par défaut (JWT requis).
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
import { PricesModule } from '../src/prices/prices.module';
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel } from '../src/vehicles/entities/vehicle-model.entity';
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

// ── Helper ─────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('Prices (e2e)', () => {
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
        PricesModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
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

  // ── GET /prices/defaults ───────────────────────────────────────────────────

  describe('GET /api/v1/prices/defaults', () => {
    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/defaults')
        .expect(401);
    });

    it('retourne les prix par défaut (200) pour un utilisateur authentifié', async () => {
      const token = await registerAndLogin(app, 'prices@test.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/prices/defaults')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('gas');
      expect(res.body).toHaveProperty('diesel');
      expect(res.body).toHaveProperty('evHome');
      expect(res.body).toHaveProperty('evFast');
      expect(res.body).toHaveProperty('fastShare');
      expect(res.body).toHaveProperty('source');
      expect(res.body).toHaveProperty('disclaimer');
      expect(res.body).toHaveProperty('lastUpdate');
    });

    it('les valeurs numériques sont cohérentes (€/L, €/kWh, fraction)', async () => {
      const token = await registerAndLogin(app, 'prices-values@test.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/prices/defaults')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(typeof res.body.gas).toBe('number');
      expect(typeof res.body.diesel).toBe('number');
      expect(typeof res.body.evHome).toBe('number');
      expect(typeof res.body.evFast).toBe('number');
      expect(typeof res.body.fastShare).toBe('number');
      expect(res.body.gas).toBeGreaterThan(0);
      expect(res.body.diesel).toBeGreaterThan(0);
      expect(res.body.evHome).toBeGreaterThan(0);
      expect(res.body.evFast).toBeGreaterThan(0);
      expect(res.body.fastShare).toBeGreaterThan(0);
      expect(res.body.fastShare).toBeLessThanOrEqual(1);
    });
  });
});
