import type { QueryClient } from '@tanstack/react-query';

// Prefix match covers every shipment view; only queries with active observers refetch.
export function invalidateShipmentQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['shipments'] });
}
