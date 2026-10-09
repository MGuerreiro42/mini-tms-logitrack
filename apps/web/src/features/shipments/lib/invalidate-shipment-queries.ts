import type { QueryClient } from '@tanstack/react-query';
import { shipmentKeys } from '../api/keys';

export function invalidateShipmentQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
}
