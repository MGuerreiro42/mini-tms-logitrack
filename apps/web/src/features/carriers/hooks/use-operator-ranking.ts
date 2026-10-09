'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getMyOperatorRanking } from '../api';

export function useOperatorRanking() {
  const session = useSession();

  const query = useQuery({
    queryKey: ['carriers', 'me', 'operator-ranking'],
    queryFn: () => getMyOperatorRanking(session?.token ?? ''),
    enabled: Boolean(session),
  });

  return { ...query, isLoading: query.isPending };
}
