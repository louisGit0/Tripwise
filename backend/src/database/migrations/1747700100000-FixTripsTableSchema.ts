import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration corrective — recréation complète de la table trips.
 *
 * Contexte : la migration 1747700000000 avait créé la table trips sans les
 * colonnes note, passengers_count et tolls_cost (ajoutées par 1747701000000).
 * Cette migration intermédiaire drop la table incomplète et la recrée avec
 * toutes les colonnes attendues par l'entité TypeORM Trip.
 *
 * La table trips est supposée vide au moment de l'application (aucun trajet
 * sauvegardé en V1 avant ce correctif). Il n'y a donc aucune perte de données.
 */
export class FixTripsTableSchema1747700100000 implements MigrationInterface {
  name = 'FixTripsTableSchema1747700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Supprimer la table trips existante (incomplète) ──────────────────

    await queryRunner.query(`DROP TABLE IF EXISTS "trips" CASCADE`);

    // ── 2. Supprimer et recréer le type enum energy_unit ───────────────────
    // (il peut exister depuis 1747700000000 ou pas encore selon l'état de la DB)

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."energy_unit_enum"`);

    await queryRunner.query(`
      CREATE TYPE "public"."energy_unit_enum" AS ENUM('L', 'kWh')
    `);

    // ── 3. Recréer trips avec TOUTES les colonnes de l'entité ─────────────

    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id"                  uuid                                       NOT NULL DEFAULT gen_random_uuid(),
        "user_id"             uuid                                       NOT NULL,
        "vehicle_id"          uuid,

        -- Origine
        "origin_label"        character varying                          NOT NULL,
        "origin_lat"          numeric(10,7)                              NOT NULL,
        "origin_lng"          numeric(10,7)                              NOT NULL,

        -- Destination
        "destination_label"   character varying                          NOT NULL,
        "destination_lat"     numeric(10,7)                              NOT NULL,
        "destination_lng"     numeric(10,7)                              NOT NULL,

        -- Itinéraire
        "distance_km"         numeric(8,2)                               NOT NULL,
        "duration_seconds"    integer                                    NOT NULL,

        -- Énergie & coût
        "fuel_type"           "public"."vehicle_models_fuel_type_enum"  NOT NULL,
        "energy_unit"         "public"."energy_unit_enum"               NOT NULL,
        "consumption_per_100" numeric(5,2)                              NOT NULL,
        "total_consumption"   numeric(8,3)                              NOT NULL,
        "price_per_unit"      numeric(6,4)                              NOT NULL,
        "total_cost"          numeric(8,2)                              NOT NULL,
        "charging_mode"       character varying(10),

        -- Métadonnées
        "trip_date"           TIMESTAMP                                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_archived"         boolean                                    NOT NULL DEFAULT false,
        "note"                text,
        "passengers_count"    smallint                                   NOT NULL DEFAULT 1,
        "tolls_cost"          numeric(8,2)                              NOT NULL DEFAULT 0,
        "created_at"          TIMESTAMP                                  NOT NULL DEFAULT now(),

        CONSTRAINT "PK_trips" PRIMARY KEY ("id")
      )
    `);

    // ── 4. Clés étrangères ─────────────────────────────────────────────────

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

    // ── 5. Index ───────────────────────────────────────────────────────────

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
    // Rollback simple : supprimer la table recrée.
    // L'enum energy_unit_enum appartient à la migration 1747700000000
    // et sera géré par son propre down() si besoin.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_user_fuel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_user_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_user_date"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_vehicle"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trips"`);
  }
}
