import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1747699200000 implements MigrationInterface {
  name = 'InitialSchema1747699200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."users_provider_enum" AS ENUM('local', 'google', 'apple')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."vehicle_models_fuel_type_enum"
        AS ENUM('SP95', 'SP95_E10', 'SP98', 'DIESEL', 'E85', 'GPL', 'ELECTRIC')
    `);

    // ── users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            uuid                              NOT NULL DEFAULT gen_random_uuid(),
        "email"         character varying                 NOT NULL,
        "password_hash" character varying,
        "display_name"  character varying,
        "locale"        character varying(5)              NOT NULL DEFAULT 'fr',
        "provider"      "public"."users_provider_enum"   NOT NULL DEFAULT 'local',
        "provider_id"   character varying,
        "created_at"    TIMESTAMP                         NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP                         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email"   UNIQUE ("email"),
        CONSTRAINT "PK_users"        PRIMARY KEY ("id")
      )
    `);

    // ── vehicle_models ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "vehicle_models" (
        "id"          uuid                                          NOT NULL DEFAULT gen_random_uuid(),
        "brand"       character varying                             NOT NULL,
        "model"       character varying                             NOT NULL,
        "year"        integer,
        "fuel_type"   "public"."vehicle_models_fuel_type_enum"     NOT NULL,
        "consumption" numeric(5,2)                                  NOT NULL,
        CONSTRAINT "PK_vehicle_models" PRIMARY KEY ("id")
      )
    `);

    // ── user_vehicles ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_vehicles" (
        "id"                    uuid             NOT NULL DEFAULT gen_random_uuid(),
        "user_id"               uuid             NOT NULL,
        "vehicle_model_id"      uuid             NOT NULL,
        "nickname"              character varying,
        "home_electricity_price" numeric(5,4),
        "public_charging_price"  numeric(5,4),
        "created_at"            TIMESTAMP        NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_vehicles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "user_vehicles"
        ADD CONSTRAINT "FK_user_vehicles_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_vehicles"
        ADD CONSTRAINT "FK_user_vehicles_vehicle_model"
          FOREIGN KEY ("vehicle_model_id")
          REFERENCES "vehicle_models"("id")
          ON DELETE RESTRICT
    `);

    // ── favorites ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id"                uuid             NOT NULL DEFAULT gen_random_uuid(),
        "user_id"           uuid             NOT NULL,
        "name"              character varying NOT NULL,
        "origin_label"      character varying NOT NULL,
        "origin_lat"        numeric(10,7)    NOT NULL,
        "origin_lng"        numeric(10,7)    NOT NULL,
        "destination_label" character varying NOT NULL,
        "destination_lat"   numeric(10,7)    NOT NULL,
        "destination_lng"   numeric(10,7)    NOT NULL,
        "vehicle_id"        uuid,
        "created_at"        TIMESTAMP        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorites" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
        ADD CONSTRAINT "FK_favorites_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
        ADD CONSTRAINT "FK_favorites_vehicle"
          FOREIGN KEY ("vehicle_id")
          REFERENCES "user_vehicles"("id")
          ON DELETE SET NULL
    `);

    // ── Index utiles ────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_vehicles_user_id" ON "user_vehicles" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_favorites_user_id" ON "favorites" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_favorites_vehicle"`);
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_favorites_user"`);
    await queryRunner.query(`ALTER TABLE "user_vehicles" DROP CONSTRAINT "FK_user_vehicles_vehicle_model"`);
    await queryRunner.query(`ALTER TABLE "user_vehicles" DROP CONSTRAINT "FK_user_vehicles_user"`);

    await queryRunner.query(`DROP INDEX "IDX_favorites_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_user_vehicles_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);

    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP TABLE "user_vehicles"`);
    await queryRunner.query(`DROP TABLE "vehicle_models"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."vehicle_models_fuel_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
  }
}
