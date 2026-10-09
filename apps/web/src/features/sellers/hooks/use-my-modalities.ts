'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyModalities, setMyModalities } from '../api';
import { sellerKeys } from '../api/keys';

export function useMyModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.myModalities(),
    queryFn: () => getMyModalities(token),
    enabled,
  });
}

export function useSetMyModalities() {
  return useApiMutation({
    mutationFn: (modalityIds: string[], token) =>
      setMyModalities(modalityIds, token),
    successMessage: 'Modalities saved',
    invalidates: sellerKeys.myModalities(),
  });
}
