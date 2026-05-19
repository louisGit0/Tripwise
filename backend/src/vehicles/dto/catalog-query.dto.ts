import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { FuelType } from '../entities/vehicle-model.entity';

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FuelType, { message: `fuelType doit être l'une des valeurs : ${Object.values(FuelType).join(', ')}` })
  fuelType?: FuelType;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
