import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTollIsEstimateToTrips1748000000000 implements MigrationInterface {
  name = 'AddTollIsEstimateToTrips1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pas de migration de données : default false ("source inconnue → estimée"
    // côté affichage) est acceptable pour les lignes existantes.
    await queryRunner.query(`
      ALTER TABLE "trips"
        ADD COLUMN IF NOT EXISTS "toll_is_estimate" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "toll_is_estimate"`);
  }
}
