import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserVehicle } from '../../vehicles/entities/user-vehicle.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', nullable: true, type: 'varchar' })
  passwordHash!: string | null;

  @Column({ name: 'display_name', nullable: true, type: 'varchar' })
  displayName!: string | null;

  @Column({ default: 'fr', length: 5 })
  locale!: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @Column({ name: 'provider_id', nullable: true, type: 'varchar' })
  providerId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserVehicle, (vehicle) => vehicle.user)
  vehicles!: UserVehicle[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites!: Favorite[];
}
