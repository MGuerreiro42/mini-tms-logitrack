import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min, MinDate } from 'class-validator';
import { daysAgo } from '../../../shared/stats/stats';

export class ActivityQueryDto {
  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 8;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Only events at or after this instant; at most 24 h back',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => daysAgo(1))
  since?: Date;
}
