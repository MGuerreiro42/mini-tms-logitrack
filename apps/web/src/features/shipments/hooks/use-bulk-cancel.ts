'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { plural } from '@/lib/plural';
import { cancelShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';
import type { Shipment } from '../types';

const MAX_CONCURRENT = 4;
const CODES_SHOWN = 2;

// "TMS-1, TMS-2 and 5 more": a long failure list must not swallow the toast.
export function listCodes(codes: string[]): string {
  if (codes.length <= CODES_SHOWN + 1) return codes.join(', ');
  const rest = codes.length - CODES_SHOWN;
  return `${codes.slice(0, CODES_SHOWN).join(', ')} and ${rest} more`;
}

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
  // Resolves with the ids that failed, so the caller can keep them selected for a retry.
  return async (
    shipments: Pick<Shipment, 'id' | 'trackingCode'>[],
  ): Promise<string[]> => {
    const failed: Pick<Shipment, 'id' | 'trackingCode'>[] = [];
    await eachLimited(shipments, MAX_CONCURRENT, (shipment) =>
      cancelShipment(shipment.id, undefined, token).then(
        () => undefined,
        () => {
          failed.push(shipment);
        },
      ),
    );
    invalidateShipmentQueries(queryClient);

    const codes = listCodes(failed.map((shipment) => shipment.trackingCode));
    const done = shipments.length - failed.length;
    if (failed.length === 0) {
      toast.success(`Cancelled ${plural(done, 'shipment')}`);
    } else if (done === 0) {
      toast.error(`Couldn't cancel ${codes}. They stay selected to retry.`);
    } else {
      toast.error(
        `Cancelled ${plural(done, 'shipment')}. Couldn't cancel ${codes}; they stay selected.`,
      );
    }
    return failed.map((shipment) => shipment.id);
  };
}
