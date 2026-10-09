'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/services/api-client';
import { cancelShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

export function useCancelShipment() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      cancelShipment(id, note, token),
    onSuccess: () => {
      toast.success('Shipment cancelled');
      invalidateShipmentQueries(queryClient);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 409) {
        toast.error('This shipment can no longer be cancelled.');
        // The status moved on elsewhere; refresh so the page shows it.
        invalidateShipmentQueries(queryClient);
        return;
      }
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
