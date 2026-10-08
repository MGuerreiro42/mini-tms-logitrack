'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getMyCarrierPerformance } from '../api';

export function useCarrierPerformance() {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'me', 'performance'],
    queryFn: () => getMyCarrierPerformance(session?.token ?? ''),
    enabled: Boolean(session),
  });
}
