import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class AddUserVehicleDto {
  @IsUUID()
  vehicleModelId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  homeElectricityPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  publicChargingPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  licensePlate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  homeChargingRatio?: number;
}
