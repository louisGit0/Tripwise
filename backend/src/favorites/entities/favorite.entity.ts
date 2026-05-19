import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserVehicle } from '../../vehicles/entities/user-vehicle.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  name!: string;

  @Column({ name: 'origin_label' })
  originLabel!: string;

  @Column({ name: 'origin_lat', type: 'decimal', precision: 10, scale: 7 })
  originLat!: number;

  @Column({ name: 'origin_lng', type: 'decimal', precision: 10, scale: 7 })
  originLng!: number;

  @Column({ name: 'destination_label' })
  destinationLabel!: string;

  @Column({ name: 'destination_lat', type: 'decimal', precision: 10, scale: 7 })
  destinationLat!: number;

  @Column({ name: 'destination_lng', type: 'decimal', precision: 10, scale: 7 })
  destinationLng!: number;

  @Column({ name: 'vehicle_id', nullable: true, type: 'uuid' })
  vehicleId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => UserVehicle, (uv) => uv.favorites, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: UserVehicle | null;
}
