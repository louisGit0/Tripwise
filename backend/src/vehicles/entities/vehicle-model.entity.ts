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

  @Column({ name: 'fuel_type', type: 'enum', enum: FuelType })
  fuelType!: FuelType;

  /**
   * L/100km pour les thermiques, kWh/100km pour les électriques.
   * Valeurs indicatives basées sur les moyennes constructeur.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  consumption!: number;

  @OneToMany(() => UserVehicle, (uv) => uv.vehicleModel)
  userVehicles!: UserVehicle[];
}
