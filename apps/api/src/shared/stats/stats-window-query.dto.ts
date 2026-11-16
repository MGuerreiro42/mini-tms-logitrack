import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, MaxDate, MinDate } from 'class-validator';
import {
  DEFAULT_STATS_WINDOW_DAYS,
  daysAgo,
  MAX_STATS_WINDOW_DAYS,
  type StatsWindow,
  WINDOW_DAYS,
} from './stats';

export const WindowQuery = () =>
  applyDecorators(
    ApiPropertyOptional({
      enum: Object.keys(WINDOW_DAYS),
      description: 'Only shipments created in the last 7, 30 or 90 days',
    }),
    IsOptional(),
    IsIn(Object.keys(WINDOW_DAYS)),
  );

export class WindowQueryDto {
  @WindowQuery()
  window?: StatsWindow;
}

export class StatsWindowQueryDto extends WindowQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: `Only shipments created at or after this instant count; ignored when window is given. Defaults to the last ${DEFAULT_STATS_WINDOW_DAYS} days; at most ${MAX_STATS_WINDOW_DAYS} days back`,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => daysAgo(MAX_STATS_WINDOW_DAYS))
  @MaxDate(() => new Date())
  since?: Date;
}
