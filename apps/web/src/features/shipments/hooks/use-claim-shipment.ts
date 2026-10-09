'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { ApiError } from '@/services/api-client';
import { claimShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

export function useClaimShipment() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => claimShipment(id, token),
    onSuccess: () => {
      toast.success('Shipment claimed');
      invalidateShipmentQueries(queryClient);
    },
    onError: (error) => {
      // Someone else claimed it first: refresh so the row shows the new owner.
      if (error instanceof ApiError && error.statusCode === 409) {
        invalidateShipmentQueries(queryClient);
      }
      toastApiError(error);
    },
  });
}
