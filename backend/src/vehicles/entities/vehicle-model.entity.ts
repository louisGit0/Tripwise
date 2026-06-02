import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { UserVehicle } from './user-vehicle.entity';
import { decimalTransformer } from '../../common/column-transformers';

export enum FuelType {
  SP95 = 'SP95',
  SP95_E10 = 'SP95_E10',
  SP98 = 'SP98',
  DIESEL = 'DIESEL',
  E85 = 'E85',
  GPL = 'GPL',
  ELECTRIC = 'ELECTRIC',
}

@Entity('vehicle_models')
// Canonical uniqueness on (brand, model, fuel_type) — year is metadata, NOT in the
// key (cross-source merge collapses all years of a model to one entry). Enforces
// cross-source dedup (CAT-03) and enables `ON CONFLICT (brand, model, fuel_type)`
// upserts (CAT-05). Declared here so SQLite `synchronize:true` (the e2e harness)
// builds the same constraint the Postgres migration creates with IF NOT EXISTS.
@Index('UQ_vehicle_models_canonical', ['brand', 'model', 'fuelType'], {
  unique: true,
})
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  brand!: string;

  @Column()
  model!: string;

  @Column({ nullable: true, type: 'int' })
  year!: number | null;

  @Column({ name: 'fuel_type', type: 'simple-enum', enum: FuelType })
  fuelType!: FuelType;

  /**
   * L/100km pour les thermiques, kWh/100km pour les électriques.
   * Valeurs indicatives basées sur les moyennes constructeur (WLTP).
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: decimalTransformer })
  consumption!: number;

  /**
   * Capacité brute de la batterie en kWh.
   * Renseigné uniquement pour les véhicules électriques — null pour les thermiques.
   * Valeurs indicatives (source : fiches constructeur).
   */
  @Column({
    name: 'battery_capacity_kwh',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  batteryCapacityKwh!: number | null;

  /**
   * Capacité du réservoir en litres.
   * Renseigné uniquement pour les thermiques — null pour les électriques.
   * Valeurs indicatives (source : fiches constructeur).
   */
  @Column({
    name: 'tank_capacity_liters',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: decimalTransformer,
  })
  tankCapacityLiters!: number | null;

  /**
   * Provenance de l'entrée du catalogue (CAT-02) : 'ademe' (France, WLTP),
   * 'epa' (US), ou une source future. Plain varchar — PAS un enum Postgres —
   * pour que l'ajout d'une 3e source ne requière aucun `ALTER TYPE` (CAT-05).
   * Les lignes antérieures à la migration retombent sur 'ademe' (defaut).
   */
  @Column({ type: 'varchar', length: 16, default: 'ademe' })
  source!: string;

  @OneToMany(() => UserVehicle, (uv) => uv.vehicleModel)
  userVehicles!: UserVehicle[];
}
