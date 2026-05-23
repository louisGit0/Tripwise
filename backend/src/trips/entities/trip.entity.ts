import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserVehicle } from '../../vehicles/entities/user-vehicle.entity';
import { FuelType } from '../../vehicles/entities/vehicle-model.entity';

/** Unité d'énergie consommée : litres pour les thermiques, kWh pour les électriques. */
export enum EnergyUnit {
  L = 'L',
  KWH = 'kWh',
}

@Entity('trips')
@Index('IDX_trips_user_date', ['userId', 'tripDate'])
@Index('IDX_trips_user_archived', ['userId', 'isArchived'])
@Index('IDX_trips_user_fuel', ['userId', 'fuelType'])
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'vehicle_id', nullable: true, type: 'uuid' })
  vehicleId!: string | null;

  // ── Origine ──────────────────────────────────────────────────────────────

  @Column({ name: 'origin_label' })
  originLabel!: string;

  @Column({ name: 'origin_lat', type: 'decimal', precision: 10, scale: 7 })
  originLat!: number;

  @Column({ name: 'origin_lng', type: 'decimal', precision: 10, scale: 7 })
  originLng!: number;

  // ── Destination ──────────────────────────────────────────────────────────

  @Column({ name: 'destination_label' })
  destinationLabel!: string;

  @Column({ name: 'destination_lat', type: 'decimal', precision: 10, scale: 7 })
  destinationLat!: number;

  @Column({ name: 'destination_lng', type: 'decimal', precision: 10, scale: 7 })
  destinationLng!: number;

  // ── Itinéraire ───────────────────────────────────────────────────────────

  /** Distance calculée par Mapbox, en kilomètres */
  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2 })
  distanceKm!: number;

  /** Durée estimée par Mapbox, en secondes */
  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds!: number;

  // ── Énergie & coût ───────────────────────────────────────────────────────

  /** Type de carburant du véhicule au moment du calcul */
  @Column({ name: 'fuel_type', type: 'simple-enum', enum: FuelType })
  fuelType!: FuelType;

  /**
   * Unité d'énergie : 'L' pour les thermiques, 'kWh' pour les électriques.
   * Détermine l'interprétation de consumption_per_100, total_consumption et price_per_unit.
   */
  @Column({ name: 'energy_unit', type: 'simple-enum', enum: EnergyUnit })
  energyUnit!: EnergyUnit;

  /**
   * Consommation aux 100 km (L/100km ou kWh/100km) issue du profil véhicule.
   * Valeur indicative — consommation réelle non mesurée.
   */
  @Column({ name: 'consumption_per_100', type: 'decimal', precision: 5, scale: 2 })
  consumptionPer100!: number;

  /** Consommation totale estimée pour le trajet (litres ou kWh) */
  @Column({ name: 'total_consumption', type: 'decimal', precision: 8, scale: 3 })
  totalConsumption!: number;

  /** Prix unitaire appliqué (€/L ou €/kWh) au moment du calcul */
  @Column({ name: 'price_per_unit', type: 'decimal', precision: 6, scale: 4 })
  pricePerUnit!: number;

  /** Coût total estimé du trajet en euros */
  @Column({ name: 'total_cost', type: 'decimal', precision: 8, scale: 2 })
  totalCost!: number;

  /**
   * Mode de recharge appliqué — null pour les thermiques.
   * Valeurs possibles : 'home' | 'public' | 'mix'
   */
  @Column({ name: 'charging_mode', nullable: true, type: 'varchar', length: 10 })
  chargingMode!: string | null;

  // ── Métadonnées ──────────────────────────────────────────────────────────

  /** Date et heure du trajet (par défaut : moment du calcul) */
  @Column({ name: 'trip_date', default: () => 'CURRENT_TIMESTAMP' })
  tripDate!: Date;

  /** Trajet archivé (masqué de l'historique actif, conservé pour les stats) */
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived!: boolean;

  /** Note libre sur le trajet (texte court, max 500 chars) */
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** Nombre de passagers — pour le calcul coût/personne. Défaut : 1 */
  @Column({ name: 'passengers_count', type: 'smallint', default: 1 })
  passengersCount!: number;

  /**
   * Frais de péage estimés en euros. V1 = 0 (non calculé automatiquement).
   * Réservé pour une future intégration API péages.
   */
  @Column({ name: 'tolls_cost', type: 'decimal', precision: 8, scale: 2, default: 0 })
  tollsCost!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => UserVehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: UserVehicle | null;
}
