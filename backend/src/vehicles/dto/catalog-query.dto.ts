import { IsOptional, IsString, IsEnum, IsInt, IsIn, Min, Max } from 'class-validator';
import { FuelType } from '../entities/vehicle-model.entity';
import type { FuelCategory } from '../../common/fuel-type-categories';

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FuelType, { message: `fuelType doit être l'une des valeurs : ${Object.values(FuelType).join(', ')}` })
  fuelType?: FuelType;

  @IsOptional()
  @IsIn(['gas', 'diesel', 'ev', 'gpl'], { message: `fuelCategory doit être l'une des valeurs : gas, diesel, ev, gpl` })
  fuelCategory?: FuelCategory;

  @IsOptional()
  @IsString()
  brand?: string;

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
