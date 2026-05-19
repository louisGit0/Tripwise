import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GeocodeQueryDto {
  @IsString()
  @MinLength(2, { message: 'q doit contenir au moins 2 caractères' })
  @MaxLength(256)
  q!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
