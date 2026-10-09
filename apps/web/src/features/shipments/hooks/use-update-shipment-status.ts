'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { updateShipmentStatus } from '../api';
import { shipmentKeys } from '../api/keys';
import type { UpdateShipmentStatusInput } from '../types';

export function useUpdateShipmentStatus() {
  return useApiMutation({
    mutationFn: (
      { id, ...input }: UpdateShipmentStatusInput & { id: string },
      token,
    ) => updateShipmentStatus(id, input, token),
    successMessage: 'Status updated',
    invalidates: shipmentKeys.all,
  });
}
