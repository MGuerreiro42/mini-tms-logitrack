import type { QueryClient } from '@tanstack/react-query';

export function invalidateShipmentQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['shipments'] });
}
