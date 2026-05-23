/**
 * Tests e2e du module Auth.
 *
 * Ces tests utilisent une base SQLite en mémoire pour ne pas dépendre
 * d'une instance PostgreSQL. TypeORM est reconfiguré dans le module de test.
 * Les stratégies OAuth (Google, Apple) sont mockées car elles nécessitent
 * des redirections externes.
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
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel } from '../src/vehicles/entities/vehicle-model.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { Trip } from '../src/trips/entities/trip.entity';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';
import { AppleStrategy } from '../src/auth/strategies/apple.strategy';

// Stub OAuth strategies — ne nécessitent pas de credentials réels
class GoogleStrategyMock extends PassportStrategy(Strategy, 'google') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

class AppleStrategyMock extends PassportStrategy(Strategy, 'apple') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              app: {
                jwtSecret: 'test-jwt-secret-at-least-32-chars-long',
                jwtAccessExpiresIn: '15m',
                jwtRefreshExpiresIn: '7d',
                nodeEnv: 'test',
                port: 3001,
                apiPrefix: 'api/v1',
                corsOrigins: ['http://localhost:3001'],
                mapboxToken: '',
              },
            }),
          ],
        }),
        // better-sqlite3 en mémoire pour les tests — pas de PostgreSQL requis
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User, UserVehicle, VehicleModel, Favorite, Trip],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        UsersModule,
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Register ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('crée un compte et retourne un JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'alice@example.com', password: 'Secret12', displayName: 'Alice' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({
        email: 'alice@example.com',
        displayName: 'Alice',
        provider: 'local',
      });
    });

    it('rejette un email déjà utilisé (409)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'alice@example.com', password: 'Secret12' });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'alice@example.com', password: 'OtherPass99' })
        .expect(409);
    });

    it('rejette un mot de passe sans chiffre (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bob@example.com', password: 'NoDigitsHere' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('chiffre'),
        ]),
      );
    });

    it('rejette un mot de passe trop court (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bob@example.com', password: 'Sh0rt' })
        .expect(400);
    });

    it('rejette un email invalide (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'Valid123' })
        .expect(400);
    });
  });

  // ── Login ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'charlie@example.com', password: 'Passw0rd' });
    });

    it('retourne un JWT avec les bons credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'charlie@example.com', password: 'Passw0rd' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('charlie@example.com');
    });

    it('rejette un mauvais mot de passe (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'charlie@example.com', password: 'WrongPass1' })
        .expect(401);
    });

    it('rejette un email inconnu (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Passw0rd' })
        .expect(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'diana@example.com', password: 'MyPass42' });
      token = res.body.accessToken as string;
    });

    it('retourne le profil avec un token valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'diana@example.com',
        provider: 'local',
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('retourne 401 avec un token invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });
});
