import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTollIsEstimateToTrips1748000000000 implements MigrationInterface {
  name = 'AddTollIsEstimateToTrips1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Default true : sous D-07 (pas de clé TollGuru), tout péage est une estimation
    // heuristique. Les lignes antérieures à la migration sont donc rétro-comblées
    // comme estimées — la direction honnête côté affichage ("≈ estimé").
    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN IF NOT EXISTS "toll_is_estimate" BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "toll_is_estimate"`);
  }
}
