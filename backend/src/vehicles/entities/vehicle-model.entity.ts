import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { UserVehicle } from './user-vehicle.entity';

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
  @Column({ type: 'decimal', precision: 5, scale: 2 })
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
  })
  tankCapacityLiters!: number | null;

  @OneToMany(() => UserVehicle, (uv) => uv.vehicleModel)
  userVehicles!: UserVehicle[];
}
