import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineStringGeometryDto {
  @IsString()
  @IsIn(['LineString'])
  type!: string;

  @IsArray()
  coordinates!: [number, number][];
}

export class AlongRouteBodyDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => LineStringGeometryDto)
  geometry!: LineStringGeometryDto;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10_000)
  maxDistanceMeters?: number;
}
