import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripMetaFields1747701000000 implements MigrationInterface {
  name = 'AddTripMetaFields1747701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN "note" TEXT NULL`);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN "passengers_count" SMALLINT NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN "tolls_cost" NUMERIC(8,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "tolls_cost"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "passengers_count"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "note"`);
  }
}
