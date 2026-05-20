import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FuelType } from '../../vehicles/entities/vehicle-model.entity';

const THERMAL_FUEL_TYPES = [
  FuelType.SP95, FuelType.SP95_E10, FuelType.SP98,
  FuelType.DIESEL, FuelType.E85, FuelType.GPL,
] as const;

export class FuelPriceQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsEnum(THERMAL_FUEL_TYPES, {
    message: `fuelType doit être l'un de: ${THERMAL_FUEL_TYPES.join(', ')}`,
  })
  fuelType!: FuelType;
}
