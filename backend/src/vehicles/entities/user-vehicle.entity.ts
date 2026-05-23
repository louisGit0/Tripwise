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

  /** Plaque d'immatriculation — optionnelle, affichage uniquement */
  @Column({ name: 'license_plate', nullable: true, type: 'varchar', length: 20 })
  licensePlate!: string | null;

  /** Véhicule par défaut de l'utilisateur (un seul par compte) */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  /**
   * Proportion des recharges effectuées à domicile (0.00–1.00).
   * Utilisée pour le mode de recharge « mix » dans le calcul de trajet.
   * Défaut : 0.70 (70 % à domicile).
   */
  @Column({
    name: 'home_charging_ratio',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    default: 0.70,
  })
  homeChargingRatio!: number | null;

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
