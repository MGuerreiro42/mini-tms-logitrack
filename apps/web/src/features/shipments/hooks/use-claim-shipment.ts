'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { claimShipment } from '../api';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

export function useClaimShipment() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => claimShipment(id, session?.token ?? ''),
    onSuccess: (shipment) => {
      toast.success('Shipment claimed');
      invalidateShipmentQueries(queryClient, shipment.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
