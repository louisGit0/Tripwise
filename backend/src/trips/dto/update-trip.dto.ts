import { IsOptional, IsBoolean, IsDateString, IsString, MaxLength } from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsDateString()
  tripDate?: string;
}
