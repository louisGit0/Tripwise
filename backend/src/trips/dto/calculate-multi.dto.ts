import {
  IsDefined,
  IsUUID,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CoordinatePointDto } from './calculate-trip.dto';

export class CalculateMultiDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  origin!: CoordinatePointDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  destination!: CoordinatePointDto;

  @IsOptional()
  @IsUUID()
  userVehicleId?: string;

  @IsOptional()
  @IsIn(['home', 'public', 'mix'])
  chargingMode?: 'home' | 'public' | 'mix';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  passengersCount?: number;
}
