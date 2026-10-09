'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { approveCarrier, rejectCarrier } from '../api';
import { carrierKeys } from '../api/keys';

export function useApproveCarrier(id: string) {
  return useApiMutation({
    mutationFn: (_: void, token) => approveCarrier(id, token),
    successMessage: 'Carrier approved',
    invalidates: carrierKeys.all,
  });
}

export function useRejectCarrier(id: string) {
  return useApiMutation({
    mutationFn: (_: void, token) => rejectCarrier(id, token),
    successMessage: 'Carrier rejected',
    invalidates: carrierKeys.all,
  });
}
