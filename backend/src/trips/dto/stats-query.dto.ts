import { IsOptional, Matches } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month doit être au format YYYY-MM' })
  month?: string;
}
