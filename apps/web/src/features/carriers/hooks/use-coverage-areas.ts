'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/services/api-client';
import { getMyCoverageAreas, setMyCoverageAreas } from '../api';
import type { CoverageAreaInput } from '../types';

export function useCoverageAreas() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'me', 'coverage-areas'],
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
        queryKey: ['carriers', 'me', 'coverage-areas'],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
