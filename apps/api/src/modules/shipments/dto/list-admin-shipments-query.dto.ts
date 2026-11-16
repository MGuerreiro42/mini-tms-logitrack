import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';
import type { StatsWindow } from '../../../shared/stats/stats';
import { WindowQuery } from '../../../shared/stats/stats-window-query.dto';
import { ADMIN_VIEWS } from '../shipment-views';
import { SearchQuery, ViewQuery } from './list-filters.decorators';

export class ListAdminShipmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ViewQuery(ADMIN_VIEWS)
  view?: (typeof ADMIN_VIEWS)[number];

  @WindowQuery()
  window?: StatsWindow;

  @SearchQuery()
  q?: string;
}
