'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyCarrierModalities, setMyCarrierModalities } from '../api';
import { carrierKeys } from '../api/keys';

export function useMyCarrierModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.myModalities(),
    queryFn: () => getMyCarrierModalities(token),
    enabled,
  });
}

export function useSetMyCarrierModalities() {
  return useApiMutation({
    mutationFn: (modalityIds: string[], token) =>
      setMyCarrierModalities(modalityIds, token),
    successMessage: 'Modalities saved',
    invalidates: carrierKeys.myModalities(),
  });
}
