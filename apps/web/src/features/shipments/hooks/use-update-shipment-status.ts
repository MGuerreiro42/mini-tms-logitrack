'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { updateShipmentStatus } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';
import type { ShipmentStatus } from '../types';

export function useUpdateShipmentStatus() {
  const session = useSession();
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
    }) => updateShipmentStatus(id, { status, note }, session?.token ?? ''),
    onSuccess: (shipment) => {
      toast.success('Status updated');
      invalidateShipmentQueries(queryClient, shipment.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
