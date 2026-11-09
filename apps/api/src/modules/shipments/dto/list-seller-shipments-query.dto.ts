import type { StatsWindow } from '../../../shared/stats/stats';
import { WindowQuery } from '../../../shared/stats/stats-window-query.dto';
import { SELLER_VIEWS } from '../shipment-views';
import { SearchQuery, ViewQuery } from './list-filters.decorators';
import { ListShipmentsQueryDto } from './list-shipments-query.dto';

export class ListSellerShipmentsQueryDto extends ListShipmentsQueryDto {
  @ViewQuery(SELLER_VIEWS)
  view?: (typeof SELLER_VIEWS)[number];

  @WindowQuery()
  window?: StatsWindow;

  @SearchQuery()
  q?: string;
}
