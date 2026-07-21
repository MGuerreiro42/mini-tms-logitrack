import type { QueryClient } from '@tanstack/react-query';

// Every live-updating shipment view funnels through this — the WebSocket
// push handler (use-shipment-tracking.ts) and both the claim/status
// mutations' own onSuccess (use-claim-shipment.ts, use-update-shipment-
// status.ts) — instead of each hand-copying the same query keys.
// Invalidating a key nothing has fetched yet (e.g. a carrier's own tab has
// no seller-facing 'detail' cache entry, or no admin tab is even open) is a
// harmless no-op, so listing all of them unconditionally here is simpler
// than each caller guessing which subset applies to it.
export function invalidateShipmentQueries(
  queryClient: QueryClient,
  shipmentId?: string,
): void {
  if (shipmentId) {
    queryClient.invalidateQueries({
      queryKey: ['shipments', 'detail', shipmentId],
    });
    queryClient.invalidateQueries({
      queryKey: ['shipments', 'queue', 'detail', shipmentId],
    });
  }
  queryClient.invalidateQueries({ queryKey: ['shipments', 'queue', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['shipments', 'admin', 'list'] });
}
