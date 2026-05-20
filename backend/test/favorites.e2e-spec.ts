/**
 * Tests e2e du module Favorites.
 *
 * I18nService est mocké pour éviter la dépendance aux fichiers JSON i18n.
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
import { FavoritesModule } from '../src/favorites/favorites.module';
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

// ── Helper ─────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('Favorites (e2e)', () => {
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
        VehiclesModule,
        FavoritesModule,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('Auth requise sur tous les endpoints', () => {
    it('GET /favorites sans token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/favorites').expect(401);
    });
    it('POST /favorites sans token → 401', async () => {
      await request(app.getHttpServer()).post('/api/v1/favorites').expect(401);
    });
  });

  // ── CRUD ───────────────────────────────────────────────────────────────────

  describe('CRUD complet', () => {
    let token: string;
    let favId: string;

    const BASE_FAV = {
      name: 'Maison → Bureau',
      originLabel: 'Paris 12e',
      originLat: 48.8448,
      originLng: 2.3737,
      destinationLabel: 'La Défense',
      destinationLat: 48.8921,
      destinationLng: 2.2358,
    };

    beforeAll(async () => {
      token = await registerAndLogin(app, 'fav-crud@test.com');
    });

    it('POST /favorites → crée un favori (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send(BASE_FAV)
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Maison → Bureau',
        originLabel: 'Paris 12e',
        destinationLabel: 'La Défense',
      });
      expect(res.body.id).toBeDefined();
      favId = res.body.id as string;
    });

    it('GET /favorites → retourne la liste', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toMatchObject({ name: 'Maison → Bureau' });
    });

    it('GET /favorites/:id → retourne le favori', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(favId);
      expect(res.body.name).toBe('Maison → Bureau');
    });

    it('PATCH /favorites/:id → modifie le nom', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Trajet quotidien' })
        .expect(200);

      expect(res.body.name).toBe('Trajet quotidien');
    });

    it('DELETE /favorites/:id → supprime (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Vérifie que le favori n'existe plus
      await request(app.getHttpServer())
        .get(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── Contrôle d'accès ───────────────────────────────────────────────────────

  describe('Contrôle de propriété', () => {
    let ownerToken: string;
    let otherToken: string;
    let favId: string;

    beforeAll(async () => {
      ownerToken = await registerAndLogin(app, 'fav-owner@test.com');
      otherToken = await registerAndLogin(app, 'fav-other@test.com');

      const r = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Favori privé',
          originLabel: 'Paris',
          originLat: 48.8566,
          originLng: 2.3522,
          destinationLabel: 'Lyon',
          destinationLat: 45.7640,
          destinationLng: 4.8357,
        });
      favId = r.body.id as string;
    });

    it("GET /favorites/:id d'un autre utilisateur → 403", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it("PATCH /favorites/:id d'un autre utilisateur → 403", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it("DELETE /favorites/:id d'un autre utilisateur → 403", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${favId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('GET /favorites liste uniquement les favoris du propriétaire', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const ids = (res.body as Array<{ id: string }>).map((f) => f.id);
      expect(ids).not.toContain(favId);
    });
  });

  // ── Validations DTO ────────────────────────────────────────────────────────

  describe('Validations', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'fav-val@test.com'); });

    it('rejette name vide → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '',
          originLabel: 'A', originLat: 0, originLng: 0,
          destinationLabel: 'B', destinationLat: 1, destinationLng: 1,
        })
        .expect(400);
    });

    it('rejette originLat > 90 → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          originLabel: 'A', originLat: 999, originLng: 0,
          destinationLabel: 'B', destinationLat: 1, destinationLng: 1,
        })
        .expect(400);
    });

    it('rejette vehicleId non-UUID → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          originLabel: 'A', originLat: 0, originLng: 0,
          destinationLabel: 'B', destinationLat: 1, destinationLng: 1,
          vehicleId: 'not-a-uuid',
        })
        .expect(400);
    });

    it('PATCH rejette name vide → 400', async () => {
      const r = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Valid',
          originLabel: 'A', originLat: 0, originLng: 0,
          destinationLabel: 'B', destinationLat: 1, destinationLng: 1,
        });
      await request(app.getHttpServer())
        .patch(`/api/v1/favorites/${r.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);
    });

    it('GET /favorites/:id avec UUID invalide → 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/favorites/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('GET /favorites/:id inconnu → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/favorites/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── i18n ───────────────────────────────────────────────────────────────────
  // Note : I18nService est @Optional() → null en test (pas de I18nModule).
  // Les tests vérifient que l'endpoint retourne le bon code HTTP quel que soit
  // le header de langue. Le message d'erreur contient la clé i18n (fallback).

  describe('Détection de langue', () => {
    let token: string;
    beforeAll(async () => { token = await registerAndLogin(app, 'fav-i18n@test.com'); });

    it('retourne 404 avec Accept-Language: en', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/favorites/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept-Language', 'en')
        .expect(404);

      // En l'absence de I18nModule, le message est la clé i18n brute
      expect(res.body.message).toContain('favorites.not_found');
    });

    it('retourne 404 avec ?lang=en', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/favorites/00000000-0000-0000-0000-000000000000?lang=en')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toContain('favorites.not_found');
    });
  });
});
