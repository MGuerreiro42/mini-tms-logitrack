import { SELLER_VIEWS } from '../shipment-views';
import { SearchQuery, ViewQuery } from './list-filters.decorators';
import { ListShipmentsQueryDto } from './list-shipments-query.dto';

export class ListSellerShipmentsQueryDto extends ListShipmentsQueryDto {
  @ViewQuery(SELLER_VIEWS)
  view?: (typeof SELLER_VIEWS)[number];

  @SearchQuery()
  q?: string;
}
