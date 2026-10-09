'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { claimShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useClaimShipment() {
  return useApiMutation({
    mutationFn: (id: string, token) => claimShipment(id, token),
    successMessage: 'Shipment claimed',
    invalidates: shipmentKeys.all,
  });
}
