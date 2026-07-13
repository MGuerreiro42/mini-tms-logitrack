'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { getMyCoverageAreas, setMyCoverageAreas } from '../api';
import type { CoverageAreaInput } from '../types';

export function useCoverageAreas() {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'me', 'coverage-areas'],
    queryFn: () => getMyCoverageAreas(session?.token ?? ''),
    enabled: Boolean(session),
  });
}

export function useSetCoverageAreas() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (areas: CoverageAreaInput[]) =>
      setMyCoverageAreas(areas, session?.token ?? ''),
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
