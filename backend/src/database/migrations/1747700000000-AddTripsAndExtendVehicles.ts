import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripsAndExtendVehicles1747700000000 implements MigrationInterface {
  name = 'AddTripsAndExtendVehicles1747700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Étendre vehicle_models ───────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "vehicle_models"
        ADD COLUMN "battery_capacity_kwh" numeric(5,2) NULL,
        ADD COLUMN "tank_capacity_liters" numeric(5,1) NULL
    `);

    // ── 2. Étendre user_vehicles ────────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "user_vehicles"
        ADD COLUMN "license_plate"      character varying(20) NULL,
        ADD COLUMN "is_default"         boolean               NOT NULL DEFAULT false,
        ADD COLUMN "home_charging_ratio" numeric(3,2)          NULL     DEFAULT 0.70
    `);

    // ── 3. Nouveau type enum pour l'unité d'énergie ─────────────────────────

    await queryRunner.query(`
      CREATE TYPE "public"."energy_unit_enum" AS ENUM('L', 'kWh')
    `);

    // ── 4. Table trips ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id"                  uuid                                        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"             uuid                                        NOT NULL,
        "vehicle_id"          uuid,
        "origin_label"        character varying                           NOT NULL,
        "origin_lat"          numeric(10,7)                               NOT NULL,
        "origin_lng"          numeric(10,7)                               NOT NULL,
        "destination_label"   character varying                           NOT NULL,
        "destination_lat"     numeric(10,7)                               NOT NULL,
        "destination_lng"     numeric(10,7)                               NOT NULL,
        "distance_km"         numeric(8,2)                                NOT NULL,
        "duration_seconds"    integer                                     NOT NULL,
        "fuel_type"           "public"."vehicle_models_fuel_type_enum"   NOT NULL,
        "energy_unit"         "public"."energy_unit_enum"                NOT NULL,
        "consumption_per_100" numeric(5,2)                               NOT NULL,
        "total_consumption"   numeric(8,3)                               NOT NULL,
        "price_per_unit"      numeric(6,4)                               NOT NULL,
        "total_cost"          numeric(8,2)                               NOT NULL,
        "charging_mode"       character varying(10),
        "trip_date"           TIMESTAMP                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_archived"         boolean                                     NOT NULL DEFAULT false,
        "created_at"          TIMESTAMP                                   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trips" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD CONSTRAINT "FK_trips_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD CONSTRAINT "FK_trips_vehicle"
          FOREIGN KEY ("vehicle_id")
          REFERENCES "user_vehicles"("id")
          ON DELETE SET NULL
    `);

    // ── 5. Index trips ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE INDEX "IDX_trips_user_date"
        ON "trips" ("user_id", "trip_date" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trips_user_archived"
        ON "trips" ("user_id", "is_archived")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trips_user_fuel"
        ON "trips" ("user_id", "fuel_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Inverser dans l'ordre inverse ────────────────────────────────────────

    await queryRunner.query(`DROP INDEX "IDX_trips_user_fuel"`);
    await queryRunner.query(`DROP INDEX "IDX_trips_user_archived"`);
    await queryRunner.query(`DROP INDEX "IDX_trips_user_date"`);

    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_trips_vehicle"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_trips_user"`);

    await queryRunner.query(`DROP TABLE "trips"`);

    await queryRunner.query(`DROP TYPE "public"."energy_unit_enum"`);

    await queryRunner.query(`
      ALTER TABLE "user_vehicles"
        DROP COLUMN "home_charging_ratio",
        DROP COLUMN "is_default",
        DROP COLUMN "license_plate"
    `);

    await queryRunner.query(`
      ALTER TABLE "vehicle_models"
        DROP COLUMN "tank_capacity_liters",
        DROP COLUMN "battery_capacity_kwh"
    `);
  }
}
