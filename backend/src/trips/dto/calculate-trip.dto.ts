import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsDefined,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatePointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  label?: string;
}

export class CalculateTripDto {
  @IsDefined({ message: 'origin est requis' })
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  origin!: CoordinatePointDto;

  @IsDefined({ message: 'destination est requis' })
  @ValidateNested()
  @Type(() => CoordinatePointDto)
  destination!: CoordinatePointDto;

  @IsUUID()
  userVehicleId!: string;
}
