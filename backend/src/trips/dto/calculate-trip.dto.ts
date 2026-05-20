import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsDefined,
  IsIn,
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

  /** Requis pour les véhicules électriques. Ignoré pour les thermiques. */
  @IsOptional()
  @IsIn(['home', 'public', 'mix'])
  chargingMode?: 'home' | 'public' | 'mix';

  /**
   * Pour chargingMode='mix' : proportion de charge à domicile (0.0–1.0).
   * Défaut : 0.5
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  chargingMixRatio?: number;
}
