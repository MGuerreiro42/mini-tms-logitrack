import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { StatsWindow } from '../../../shared/stats/stats';
import { WindowQuery } from '../../../shared/stats/stats-window-query.dto';
import { IsUf } from '../../../shared/validation/br-validators';
import { SELLER_LIST_VIEWS, SLA_OUTCOMES } from '../shipment-views';
import { SearchQuery, ViewQuery } from './list-filters.decorators';
import { ListShipmentsQueryDto } from './list-shipments-query.dto';

export class ListSellerShipmentsQueryDto extends ListShipmentsQueryDto {
  @ViewQuery(SELLER_LIST_VIEWS)
  view?: (typeof SELLER_LIST_VIEWS)[number];

  @WindowQuery()
  window?: StatsWindow;

  @SearchQuery()
  q?: string;

  @ApiPropertyOptional({ description: 'Destination UF' })
  @IsOptional()
  @IsUf()
  uf?: string;

  @ApiPropertyOptional({ description: 'Delivery modality code' })
  @IsOptional()
  @IsString()
  modality?: string;

  @ApiPropertyOptional({
    enum: SLA_OUTCOMES,
    description: 'DELIVERED with a dueAt, delivered by it (on-time) or after',
  })
  @IsOptional()
  @IsIn(SLA_OUTCOMES)
  sla?: (typeof SLA_OUTCOMES)[number];
}
