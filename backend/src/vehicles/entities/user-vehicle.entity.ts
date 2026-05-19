import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VehicleModel } from './vehicle-model.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

@Entity('user_vehicles')
export class UserVehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'vehicle_model_id' })
  vehicleModelId!: string;

  @Column({ nullable: true, type: 'varchar' })
  nickname!: string | null;

  /** €/kWh — renseigné uniquement pour les véhicules électriques */
  @Column({
    name: 'home_electricity_price',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  homeElectricityPrice!: number | null;

  /** €/kWh — tarif borne publique, uniquement pour les électriques */
  @Column({
    name: 'public_charging_price',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  publicChargingPrice!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => VehicleModel, (vm) => vm.userVehicles, { eager: true })
  @JoinColumn({ name: 'vehicle_model_id' })
  vehicleModel!: VehicleModel;

  @OneToMany(() => Favorite, (fav) => fav.vehicle)
  favorites!: Favorite[];
}
