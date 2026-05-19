import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { VehicleModel, FuelType } from './entities/vehicle-model.entity';
import { UserVehicle } from './entities/user-vehicle.entity';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { AddUserVehicleDto } from './dto/add-user-vehicle.dto';
import { UpdateUserVehicleDto } from './dto/update-user-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(UserVehicle)
    private readonly userVehicleRepo: Repository<UserVehicle>,
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

  findUserVehicles(userId: string): Promise<UserVehicle[]> {
    return this.userVehicleRepo.find({
      where: { userId },
      relations: { vehicleModel: true },
      order: { createdAt: 'ASC' },
    });
  }

  async addUserVehicle(userId: string, dto: AddUserVehicleDto): Promise<UserVehicle> {
    const model = await this.findOneModel(dto.vehicleModelId);
    this.validateElectricFields(model.fuelType, dto);

    const uv = this.userVehicleRepo.create({
      userId,
      vehicleModelId: dto.vehicleModelId,
      nickname: dto.nickname ?? null,
      homeElectricityPrice: model.fuelType === FuelType.ELECTRIC
        ? (dto.homeElectricityPrice ?? null)
        : null,
      publicChargingPrice: model.fuelType === FuelType.ELECTRIC
        ? (dto.publicChargingPrice ?? null)
        : null,
    });

    return this.userVehicleRepo.save(uv);
  }

  async updateUserVehicle(
    userId: string,
    vehicleId: string,
    dto: UpdateUserVehicleDto,
  ): Promise<UserVehicle> {
    const uv = await this.findOwnedVehicle(userId, vehicleId);

    if (dto.nickname !== undefined) uv.nickname = dto.nickname;
    if (dto.homeElectricityPrice !== undefined) uv.homeElectricityPrice = dto.homeElectricityPrice ?? null;
    if (dto.publicChargingPrice !== undefined) uv.publicChargingPrice = dto.publicChargingPrice ?? null;

    return this.userVehicleRepo.save(uv);
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
