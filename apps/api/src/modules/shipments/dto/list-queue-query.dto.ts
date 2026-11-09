import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ShipmentStatus } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination-query.dto';
import { CARRIER_VIEWS } from '../shipment-views';
import { SearchQuery, ViewQuery } from './list-filters.decorators';

export class ListQueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ViewQuery(CARRIER_VIEWS)
  view?: (typeof CARRIER_VIEWS)[number];

  @SearchQuery()
  q?: string;
}
