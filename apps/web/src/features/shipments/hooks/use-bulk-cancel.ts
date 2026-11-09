'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { plural } from '@/lib/plural';
import { cancelShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';
import type { Shipment } from '../types';

const MAX_CONCURRENT = 4;

// A small pool: at most `limit` calls in flight, in order.
async function eachLimited<T>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await run(items[next++]);
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

export function useBulkCancel() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  // Each through the existing endpoint, so its 409 for a shipment collected meanwhile still applies.
  return async (shipments: Pick<Shipment, 'id' | 'trackingCode'>[]) => {
    const failed: string[] = [];
    await eachLimited(shipments, MAX_CONCURRENT, (shipment) =>
      cancelShipment(shipment.id, undefined, token).then(
        () => undefined,
        () => {
          failed.push(shipment.trackingCode);
        },
      ),
    );
    invalidateShipmentQueries(queryClient);

    const done = shipments.length - failed.length;
    const summary = `Cancelled ${plural(done, 'shipment')}`;
    if (failed.length === 0) toast.success(summary);
    else toast.error(`${summary}. Couldn't cancel ${failed.join(', ')}.`);
  };
}
