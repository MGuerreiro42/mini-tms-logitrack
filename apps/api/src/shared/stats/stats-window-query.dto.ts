import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, MaxDate, MinDate } from 'class-validator';
import {
  DEFAULT_STATS_WINDOW_DAYS,
  daysAgo,
  MAX_STATS_WINDOW_DAYS,
} from './stats';

export class StatsWindowQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: `Only shipments created at or after this instant count. Defaults to the last ${DEFAULT_STATS_WINDOW_DAYS} days; at most ${MAX_STATS_WINDOW_DAYS} days back`,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => daysAgo(MAX_STATS_WINDOW_DAYS))
  @MaxDate(() => new Date())
  since?: Date;
}
