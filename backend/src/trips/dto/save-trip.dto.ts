import {
  IsUUID,
  IsNumber,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsDateString,
  IsDefined,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FuelType } from '../../vehicles/entities/vehicle-model.entity';
import { CoordinatePointDto } from './calculate-trip.dto';

export class SaveTripDto {
  @IsUUID()
  userVehicleId!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  origin!: CoordinatePointDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  destination!: CoordinatePointDto;

  @IsNumber()
  @Min(0)
  distanceMeters!: number;

  @IsNumber()
  @Min(0)
  durationSeconds!: number;

  @IsIn(Object.values(FuelType))
  fuelType!: FuelType;

  /** Consommation totale (litres ou kWh) */
  @IsNumber()
  @Min(0)
  energyAmount!: number;

  @IsIn(['L', 'kWh'])
  energyUnit!: 'L' | 'kWh';

  /** Prix unitaire : €/L ou €/kWh */
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  /** Coût énergie seul (hors péages) */
  @IsNumber()
  @Min(0)
  energyCost!: number;

  /** Coût des péages — réel (TollGuru) ou estimé, 0 si aucun péage */
  @IsOptional()
  @IsNumber()
  @Min(0)
  tollsCost?: number;

  /** True si tollsCost est une estimation heuristique, false si valeur réelle TollGuru */
  @IsOptional()
  @IsBoolean()
  tollIsEstimate?: boolean;

  @IsNumber()
  @Min(0)
  totalCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  passengersCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  tripDate?: string;
}
