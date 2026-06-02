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
 * dedupe DELETE (keep the lowest id per canonical group) therefore runs in `up`
 * BEFORE the unique index. Every statement is idempotent (`IF [NOT] EXISTS`) so
 * re-runs are safe, and `down` reverses the indexes + the column.
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
    //    auto-run deploy crashes). Delete strict canonical-triple collisions,
    //    keeping the lowest id per (brand, model, fuel_type) group. The ADEME
    //    sync already dedups in-memory so prod collisions should be zero; this
    //    is the safety net that guarantees the next CREATE UNIQUE INDEX cannot
    //    fail. `down` is reversible (no schema loss; only redundant rows go).
    await queryRunner.query(`
      DELETE FROM "vehicle_models" a
      USING "vehicle_models" b
      WHERE a.id > b.id
        AND a.brand = b.brand
        AND a.model = b.model
        AND a.fuel_type = b.fuel_type
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
