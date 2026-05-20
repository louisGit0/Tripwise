import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFavoriteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(256)
  originLabel!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng!: number;

  @IsString()
  @MaxLength(256)
  destinationLabel!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLng!: number;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
