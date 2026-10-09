import type { QueryClient } from '@tanstack/react-query';
import { shipmentKeys } from '../api/keys';

// Prefix match covers every shipment view; only queries with active observers refetch.
export function invalidateShipmentQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
}
