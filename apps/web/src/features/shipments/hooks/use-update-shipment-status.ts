'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/services/api-client';
import { updateShipmentStatus } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';
import type { ShipmentStatus } from '../types';

export function useUpdateShipmentStatus() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: ShipmentStatus;
      note?: string;
    }) => updateShipmentStatus(id, { status, note }, token),
    onSuccess: () => {
      toast.success('Status updated');
      invalidateShipmentQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
