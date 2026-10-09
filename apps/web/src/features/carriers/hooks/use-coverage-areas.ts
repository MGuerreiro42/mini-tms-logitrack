'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuthToken } from '@/hooks/use-auth-token';
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
  return useApiMutation({
    mutationFn: (areas: CoverageAreaInput[], token) =>
      setMyCoverageAreas(areas, token),
    successMessage: 'Coverage areas saved',
    invalidates: carrierKeys.coverageAreas(),
  });
}
