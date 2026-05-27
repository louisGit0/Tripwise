import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripMetaFields1747701000000 implements MigrationInterface {
  name = 'AddTripMetaFields1747701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS guards prevent errors when 1747700100000-FixTripsTableSchema
    // has already created these columns in the corrective migration.
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "note" TEXT NULL`);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN IF NOT EXISTS "passengers_count" SMALLINT NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN IF NOT EXISTS "tolls_cost" NUMERIC(8,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "tolls_cost"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "passengers_count"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "note"`);
  }
}
