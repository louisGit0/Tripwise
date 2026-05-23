import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VehicleModel, FuelType } from './entities/vehicle-model.entity';
import { UserVehicle } from './entities/user-vehicle.entity';
import { Trip } from '../trips/entities/trip.entity';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { AddUserVehicleDto } from './dto/add-user-vehicle.dto';
import { UpdateUserVehicleDto } from './dto/update-user-vehicle.dto';

export interface VehicleStats {
  tripsCount: number;
  totalDistance: number;
  totalSpent: number;
  costPerKm: number | null;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(UserVehicle)
    private readonly userVehicleRepo: Repository<UserVehicle>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Catalogue ──────────────────────────────────────────────────────────────

  async findCatalog(query: CatalogQueryDto) {
    const { search, fuelType, page = 1, limit = 20 } = query;
    const qb = this.modelRepo.createQueryBuilder('vm');

    if (search) {
      qb.andWhere(
        '(LOWER(vm.brand) LIKE :search OR LOWER(vm.model) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (fuelType) {
      qb.andWhere('vm.fuelType = :fuelType', { fuelType });
    }

    qb.orderBy('vm.brand', 'ASC').addOrderBy('vm.model', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneModel(id: string): Promise<VehicleModel> {
    const model = await this.modelRepo.findOneBy({ id });
    if (!model) throw new NotFoundException(`VehicleModel ${id} introuvable`);
    return model;
  }

  // ── Véhicules utilisateur ──────────────────────────────────────────────────

  async findUserVehicles(userId: string): Promise<Array<UserVehicle & { stats: VehicleStats }>> {
    const vehicles = await this.userVehicleRepo.find({
      where: { userId },
      relations: { vehicleModel: true },
      // isDefault DESC, createdAt ASC — le véhicule par défaut en premier
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    // Stats agrégées par vehicleId en une seule requête
    const statsRows: Array<{ vehicleId: string; tripsCount: string; totalDistance: string; totalSpent: string }> =
      await this.tripRepo
        .createQueryBuilder('trip')
        .select('trip.vehicleId', 'vehicleId')
        .addSelect('COUNT(*)', 'tripsCount')
        .addSelect('SUM(trip.distanceKm)', 'totalDistance')
        .addSelect('SUM(trip.totalCost)', 'totalSpent')
        .where('trip.userId = :userId', { userId })
        .andWhere('trip.vehicleId IS NOT NULL')
        .groupBy('trip.vehicleId')
        .getRawMany();

    const statsMap = new Map<string, VehicleStats>();
    for (const row of statsRows) {
      const dist  = Number(row.totalDistance ?? 0);
      const spent = Number(row.totalSpent ?? 0);
      statsMap.set(row.vehicleId, {
        tripsCount:    Number(row.tripsCount ?? 0),
        totalDistance: Math.round(dist * 10) / 10,
        totalSpent:    Math.round(spent * 100) / 100,
        costPerKm:     dist > 0 ? Math.round((spent / dist) * 100) / 100 : null,
      });
    }

    return vehicles.map((v) => ({
      ...v,
      stats: statsMap.get(v.id) ?? { tripsCount: 0, totalDistance: 0, totalSpent: 0, costPerKm: null },
    }));
  }

  async addUserVehicle(userId: string, dto: AddUserVehicleDto): Promise<UserVehicle> {
    const model = await this.findOneModel(dto.vehicleModelId);
    this.validateElectricFields(model.fuelType, dto);

    const isFirstVehicle = (await this.userVehicleRepo.countBy({ userId })) === 0;
    // Premier véhicule → forcé par défaut ; sinon respecter dto.isDefault
    const isDefault = isFirstVehicle || (dto.isDefault ?? false);

    return this.dataSource.transaction(async (manager) => {
      if (isDefault) {
        // Désactiver tous les véhicules actuels de l'utilisateur
        await manager.update(UserVehicle, { userId }, { isDefault: false });
      }

      const uv = manager.create(UserVehicle, {
        userId,
        vehicleModelId: dto.vehicleModelId,
        nickname:  dto.nickname ?? null,
        licensePlate: dto.licensePlate ?? null,
        isDefault,
        homeChargingRatio: model.fuelType === FuelType.ELECTRIC
          ? (dto.homeChargingRatio ?? null)
          : null,
        homeElectricityPrice: model.fuelType === FuelType.ELECTRIC
          ? (dto.homeElectricityPrice ?? null)
          : null,
        publicChargingPrice: model.fuelType === FuelType.ELECTRIC
          ? (dto.publicChargingPrice ?? null)
          : null,
      });

      return manager.save(UserVehicle, uv);
    });
  }

  async updateUserVehicle(
    userId: string,
    vehicleId: string,
    dto: UpdateUserVehicleDto,
  ): Promise<UserVehicle> {
    const uv = await this.findOwnedVehicle(userId, vehicleId);

    if (dto.nickname !== undefined)              uv.nickname              = dto.nickname;
    if (dto.homeElectricityPrice !== undefined)  uv.homeElectricityPrice  = dto.homeElectricityPrice ?? null;
    if (dto.publicChargingPrice !== undefined)   uv.publicChargingPrice   = dto.publicChargingPrice  ?? null;
    if (dto.licensePlate !== undefined)          uv.licensePlate          = dto.licensePlate ?? null;
    if (dto.homeChargingRatio !== undefined)     uv.homeChargingRatio     = dto.homeChargingRatio ?? null;

    return this.userVehicleRepo.save(uv);
  }

  async setDefaultVehicle(
    userId: string,
    vehicleId: string,
  ): Promise<{ vehicleId: string; isDefault: true }> {
    return this.dataSource.transaction(async (manager) => {
      const uv = await manager.findOne(UserVehicle, { where: { id: vehicleId } });
      if (!uv) throw new NotFoundException(`Véhicule ${vehicleId} introuvable`);
      if (uv.userId !== userId) throw new ForbiddenException('Accès refusé à ce véhicule');

      await manager.update(UserVehicle, { userId }, { isDefault: false });
      await manager.update(UserVehicle, { id: vehicleId }, { isDefault: true });

      return { vehicleId, isDefault: true as const };
    });
  }

  async removeUserVehicle(userId: string, vehicleId: string): Promise<void> {
    const uv = await this.findOwnedVehicle(userId, vehicleId);
    await this.userVehicleRepo.remove(uv);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findOwnedVehicle(userId: string, vehicleId: string): Promise<UserVehicle> {
    const uv = await this.userVehicleRepo.findOne({
      where: { id: vehicleId },
      relations: { vehicleModel: true },
    });
    if (!uv) throw new NotFoundException(`Véhicule ${vehicleId} introuvable`);
    if (uv.userId !== userId) throw new ForbiddenException('Accès refusé à ce véhicule');
    return uv;
  }

  private validateElectricFields(
    fuelType: FuelType,
    dto: Pick<AddUserVehicleDto, 'homeElectricityPrice' | 'publicChargingPrice'>,
  ) {
    if (fuelType === FuelType.ELECTRIC) {
      if (!dto.homeElectricityPrice || !dto.publicChargingPrice) {
        throw new BadRequestException(
          'homeElectricityPrice et publicChargingPrice sont requis pour un véhicule électrique',
        );
      }
    }
  }
}
