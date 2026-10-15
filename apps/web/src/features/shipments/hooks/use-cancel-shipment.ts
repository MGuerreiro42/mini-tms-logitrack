'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { cancelShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useCancelShipment() {
  return useApiMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }, token) =>
      cancelShipment(id, note, token),
    successMessage: 'Shipment cancelled',
    invalidates: shipmentKeys.all,
    conflictMessage: 'This shipment can no longer be cancelled.',
  });
}
