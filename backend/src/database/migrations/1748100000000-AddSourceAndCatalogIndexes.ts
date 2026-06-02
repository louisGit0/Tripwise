import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema foundation for the multi-source vehicle catalog (Phase 4).
 *
 * Adds the `source` provenance column (CAT-02), the canonical
 * `(brand, model, fuel_type)` UNIQUE constraint (CAT-03/CAT-05 — enables
 * `ON CONFLICT` upserts + cross-source dedup), and the search/ordering indexes
 * that keep the showroom fast at thousands of rows (CAT-06).
 *
 * CRITICAL ordering (Pitfall 5): `migrationsRun: true` auto-runs this on the
 * next Render deploy. `CREATE UNIQUE INDEX` errors out if the live table already
 * holds duplicate `(brand, model, fuel_type)` rows → deploy crash loop. The
 * dedupe (pick ONE deterministic keeper per canonical group, repoint any
 * referencing `user_vehicles` to the keeper, THEN delete the non-keepers)
 * therefore runs in `up` BEFORE the unique index. The repoint step makes the
 * delete FK-safe: `user_vehicles.vehicle_model_id` references `vehicle_models`
 * under `ON DELETE RESTRICT` (CR-01), so deleting a referenced duplicate without
 * first repointing would abort the transaction → crash loop. Every statement is
 * idempotent (`IF [NOT] EXISTS`, and the dedupe is a no-op once unique) so
 * re-runs are safe.
 *
 * IRREVERSIBILITY (CR-02): the dedupe DELETE permanently removes redundant rows
 * and `down()` CANNOT restore them. `down()` reverses ONLY the additive schema
 * changes (the indexes + the `source` column). A migrate-down/up cycle does NOT
 * recover the deleted duplicate rows — that data loss is one-way by design.
 */
export class AddSourceAndCatalogIndexes1748100000000
  implements MigrationInterface
{
  name = 'AddSourceAndCatalogIndexes1748100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Provenance column (existing rows default to 'ademe'). Plain varchar,
    //    NOT a PG enum, so a 3rd source drops in without ALTER TYPE (CAT-05).
    await queryRunner.query(`
      ALTER TABLE "vehicle_models"
        ADD COLUMN IF NOT EXISTS "source" VARCHAR(16) NOT NULL DEFAULT 'ademe'
    `);

    // 2. DEDUPE BEFORE the unique index (Pitfall 5 — MUST precede step 4 or the
    //    auto-run deploy crashes). The ADEME sync already dedups in-memory so
    //    prod collisions should be zero; this is the safety net that guarantees
    //    the next CREATE UNIQUE INDEX cannot fail.
    //
    //    CR-01 (FK-safe): `user_vehicles.vehicle_model_id` references
    //    `vehicle_models` under ON DELETE RESTRICT. A naive DELETE of a
    //    referenced duplicate would raise an FK violation, abort the migration
    //    transaction, and — because migrationsRun:true — crash-loop the deploy.
    //    So for each (brand, model, fuel_type) group we (2a) pick ONE
    //    deterministic keeper, (2b) repoint any user_vehicles pointing at a
    //    non-keeper to the keeper, then (2c) delete the non-keepers — now
    //    guaranteed unreferenced, so the DELETE cannot abort.
    //
    //    Deterministic keeper (ids are UUID → "MIN(id)" is only lexicographic
    //    text ordering, not meaningful, so the choice is made EXPLICIT): prefer
    //    a row with source='ademe' (authoritative), then the lowest id::text.
    //    Idempotent: once unique, keep_id = id for every row, so the UPDATE and
    //    DELETE both match nothing.
    //
    //    CR-02: this DELETE is IRREVERSIBLE — `down()` does NOT restore the
    //    removed rows (see class doc + down()).

    // 2b. Repoint referencing user_vehicles to the surviving keeper FIRST.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          FIRST_VALUE(id) OVER (
            PARTITION BY brand, model, fuel_type
            ORDER BY (source = 'ademe') DESC, id::text ASC
          ) AS keep_id
        FROM "vehicle_models"
      )
      UPDATE "user_vehicles" uv
         SET "vehicle_model_id" = ranked.keep_id
        FROM ranked
       WHERE uv."vehicle_model_id" = ranked.id
         AND ranked.id <> ranked.keep_id
    `);

    // 2c. Now the non-keepers are unreferenced → delete them FK-safely.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          FIRST_VALUE(id) OVER (
            PARTITION BY brand, model, fuel_type
            ORDER BY (source = 'ademe') DESC, id::text ASC
          ) AS keep_id
        FROM "vehicle_models"
      )
      DELETE FROM "vehicle_models" vm
       USING ranked
       WHERE vm.id = ranked.id
         AND ranked.id <> ranked.keep_id
    `);

    // 3. Trigram extension for index-backed ILIKE substring search (CAT-06).
    //    The target DB role must permit CREATE EXTENSION — Supabase / Neon /
    //    Render Postgres all do. If it ever fails on a constrained role, drop
    //    index #6 below: a plain ILIKE seq-scan over a few thousand rows is <5ms.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // 4. Canonical-key UNIQUE index — enforces cross-source dedup (CAT-03) and
    //    is the conflict target for `ON CONFLICT (brand, model, fuel_type)`
    //    upserts (CAT-05). year is intentionally excluded (metadata, not key).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vehicle_models_canonical"
        ON "vehicle_models" ("brand", "model", "fuel_type")
    `);

    // 5. btree(brand) — backs the catalog's ORDER BY brand + brand grouping/
    //    facet at scale.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_brand"
        ON "vehicle_models" ("brand")
    `);

    // 6. Trigram GIN — makes ILIKE '%term%' index-backed. The expression MUST
    //    match the search query expression used in plan 04-03
    //    (`lower(brand || ' ' || model)`), otherwise the planner ignores it.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_search_trgm"
        ON "vehicle_models"
        USING gin ((lower("brand" || ' ' || "model")) gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // CR-02: this reverses ONLY the additive schema changes (indexes + column).
    // The `up()` dedupe DELETE is IRREVERSIBLE — the redundant rows it removed
    // cannot be restored here. Do NOT treat a down()/up() cycle as lossless.
    //
    // Reverse order: indexes then the column. Leave the pg_trgm extension
    // installed — other features may rely on it; dropping a shared extension is
    // riskier than leaving it.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vehicle_models_search_trgm"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_brand"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_vehicle_models_canonical"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "source"`,
    );
  }
}
