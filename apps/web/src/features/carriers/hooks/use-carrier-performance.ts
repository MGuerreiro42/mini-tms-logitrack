'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getMyCarrierPerformance } from '../api';

export function useCarrierPerformance() {
  const session = useSession();

  const query = useQuery({
    queryKey: ['carriers', 'me', 'performance'],
    queryFn: () => getMyCarrierPerformance(session?.token ?? ''),
    enabled: Boolean(session),
  });

  // `isPending`, not `isLoading` — a query disabled because the session
  // hasn't hydrated yet (true during SSR) reports isLoading:false but
  // isPending:true (see the dashboards' equivalent hooks for the full
  // reasoning behind this — the same code-review finding applies here).
  return { ...query, isLoading: query.isPending };
}
