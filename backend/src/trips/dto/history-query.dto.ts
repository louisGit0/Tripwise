import { IsOptional, IsInt, Min, Max, IsIn, Matches, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class HistoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsIn(['gas', 'diesel', 'ev', 'gpl'])
  fuelCategory?: 'gas' | 'diesel' | 'ev' | 'gpl';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month doit être au format YYYY-MM' })
  month?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived: boolean = false;
}
