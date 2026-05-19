/**
 * Tests e2e du module Vehicles.
 * SQLite in-memory, pas de PostgreSQL requis.
 * Les stratégies OAuth sont mockées (idem auth.e2e-spec.ts).
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
import { User } from '../src/users/entities/user.entity';
import { UserVehicle } from '../src/vehicles/entities/user-vehicle.entity';
import { VehicleModel, FuelType } from '../src/vehicles/entities/vehicle-model.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';
import { AppleStrategy } from '../src/auth/strategies/apple.strategy';

class GoogleStrategyMock extends PassportStrategy(Strategy, 'google') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}
class AppleStrategyMock extends PassportStrategy(Strategy, 'apple') {
  constructor() { super({ usernameField: 'email' }); }
  validate() { return null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function registerAndLogin(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'Passw0rd' });
  return res.body.accessToken as string;
}

// ── Setup ──────────────────────────────────────────────────────────────────

describe('Vehicles (e2e)', () => {
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
              port: 3002,
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
      ],
    })
      .overrideProvider(GoogleStrategy).useClass(GoogleStrategyMock)
      .overrideProvider(AppleStrategy).useClass(AppleStrategyMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    modelRepo = moduleFixture.get<Repository<VehicleModel>>(getRepositoryToken(VehicleModel));

    // Insérer des modèles de test
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

  // ── Catalogue public ───────────────────────────────────────────────────────

  describe('GET /api/v1/vehicles/catalog', () => {
    it('retourne la liste paginée', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles/catalog')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('filtre par fuelType=ELECTRIC', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles/catalog?fuelType=ELECTRIC')
        .expect(200);

      expect(res.body.items.every((v: VehicleModel) => v.fuelType === 'ELECTRIC')).toBe(true);
    });

    it('filtre par search=tesla', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles/catalog?search=tesla')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].brand).toBe('Tesla');
    });

    it('retourne 400 pour un fuelType invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/vehicles/catalog?fuelType=HYDROGEN')
        .expect(400);
    });
  });

  describe('GET /api/v1/vehicles/catalog/:id', () => {
    it('retourne un modèle existant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/vehicles/catalog/${thermalModelId}`)
        .expect(200);

      expect(res.body.id).toBe(thermalModelId);
      expect(res.body.brand).toBe('Renault');
    });

    it('retourne 404 pour un id inconnu', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/vehicles/catalog/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ── Véhicules utilisateur ──────────────────────────────────────────────────

  describe('GET /api/v1/vehicles/me', () => {
    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer()).get('/api/v1/vehicles/me').expect(401);
    });

    it('retourne une liste vide pour un nouvel utilisateur', async () => {
      const token = await registerAndLogin(app, 'veh-get@test.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/v1/vehicles/me', () => {
    it('ajoute un véhicule thermique (201)', async () => {
      const token = await registerAndLogin(app, 'veh-post-thermal@test.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId, nickname: 'Ma Clio' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.nickname).toBe('Ma Clio');
      expect(res.body.homeElectricityPrice).toBeNull();
      expect(res.body.publicChargingPrice).toBeNull();
    });

    it('ajoute un véhicule électrique avec tarifs (201)', async () => {
      const token = await registerAndLogin(app, 'veh-post-elec@test.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleModelId: electricModelId,
          nickname: 'Tesla maison',
          homeElectricityPrice: 0.2272,
          publicChargingPrice: 0.45,
        })
        .expect(201);

      expect(res.body.homeElectricityPrice).toBeDefined();
      expect(res.body.publicChargingPrice).toBeDefined();
    });

    it('refuse un véhicule électrique sans tarifs (400)', async () => {
      const token = await registerAndLogin(app, 'veh-post-elec-noprice@test.com');
      await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: electricModelId })
        .expect(400);
    });

    it('refuse un vehicleModelId invalide (400)', async () => {
      const token = await registerAndLogin(app, 'veh-post-bad-uuid@test.com');
      await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: 'not-a-uuid' })
        .expect(400);
    });

    it('refuse un vehicleModelId inexistant (404)', async () => {
      const token = await registerAndLogin(app, 'veh-post-notfound@test.com');
      await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('retourne 401 sans token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .send({ vehicleModelId: thermalModelId })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/vehicles/me/:id', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'veh-patch@test.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId, nickname: 'Original' });
      vehicleId = res.body.id as string;
    });

    it('met à jour le nickname', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vehicles/me/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'Nouveau nom' })
        .expect(200);

      expect(res.body.nickname).toBe('Nouveau nom');
    });

    it('refuse la modification d\'un véhicule d\'un autre user (403)', async () => {
      const otherToken = await registerAndLogin(app, 'veh-patch-other@test.com');
      await request(app.getHttpServer())
        .patch(`/api/v1/vehicles/me/${vehicleId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ nickname: 'Volé' })
        .expect(403);
    });

    it('retourne 404 pour un id inconnu', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/vehicles/me/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'X' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/vehicles/me/:id', () => {
    let token: string;
    let vehicleId: string;

    beforeAll(async () => {
      token = await registerAndLogin(app, 'veh-delete@test.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/vehicles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ vehicleModelId: thermalModelId });
      vehicleId = res.body.id as string;
    });

    it('refuse la suppression d\'un véhicule d\'un autre user (403)', async () => {
      const otherToken = await registerAndLogin(app, 'veh-delete-other@test.com');
      await request(app.getHttpServer())
        .delete(`/api/v1/vehicles/me/${vehicleId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('supprime le véhicule (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/vehicles/me/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('retourne 404 après suppression', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/vehicles/me/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: 'ghost' })
        .expect(404);
    });
  });
});
