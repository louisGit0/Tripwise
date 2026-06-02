/**
 * Tests e2e du module Users — PATCH /users/me (édition du pseudo).
 *
 * Même harnais que auth.e2e-spec.ts : base SQLite en mémoire, préfixe global
 * api/v1, ValidationPipe whitelist/forbid/transform, stratégies OAuth mockées.
 * Les tokens sont obtenus via POST /api/v1/auth/register.
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

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

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

    // Utilisateur principal pour les cas de mutation du pseudo
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'eric@example.com', password: 'Passw0rd', displayName: 'Eric' });
    token = res.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── PATCH /api/v1/users/me ──────────────────────────────────────────────────

  describe('PATCH /api/v1/users/me', () => {
    it('met à jour le pseudo et retourne le profil (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Nouveau Pseudo' })
        .expect(200);

      expect(res.body.displayName).toBe('Nouveau Pseudo');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'eric@example.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('trim les espaces de début/fin du pseudo (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: '  Trim Me  ' })
        .expect(200);

      expect(res.body.displayName).toBe('Trim Me');
    });

    it('rejette un pseudo vide (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: '' })
        .expect(400);
    });

    it('rejette un pseudo composé uniquement d’espaces (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: '   ' })
        .expect(400);
    });

    it('rejette un pseudo de plus de 40 caractères (400)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'X'.repeat(41) })
        .expect(400);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ displayName: 'Sans Auth' })
        .expect(401);
    });

    it('rejette tout champ non autorisé et ne mute que display_name (400 + email inchangé)', async () => {
      // Utilisateur dédié pour vérifier que l'email reste intact
      const reg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'frank@example.com', password: 'Passw0rd', displayName: 'Frank' });
      const frankToken = reg.body.accessToken as string;

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${frankToken}`)
        .send({ displayName: 'X', email: 'hacker@evil.com' })
        .expect(400);

      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${frankToken}`)
        .expect(200);

      expect(me.body.email).toBe('frank@example.com');
    });
  });
});
