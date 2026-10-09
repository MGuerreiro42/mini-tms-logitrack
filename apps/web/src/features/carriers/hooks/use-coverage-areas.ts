'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { getMyCoverageAreas, setMyCoverageAreas } from '../api';
import { carrierKeys } from '../api/keys';
import type { CoverageAreaInput } from '../types';

export function useCoverageAreas() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.coverageAreas(),
    queryFn: () => getMyCoverageAreas(token),
    enabled,
  });
}

export function useSetCoverageAreas() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (areas: CoverageAreaInput[]) =>
      setMyCoverageAreas(areas, token),
    onSuccess: () => {
      toast.success('Coverage areas saved');
      queryClient.invalidateQueries({
        queryKey: carrierKeys.coverageAreas(),
      });
    },
    onError: toastApiError,
  });
}
