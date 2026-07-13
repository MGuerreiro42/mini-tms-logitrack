'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getSeller } from '../api';

export function useSeller(id: string) {
  const session = useSession();

  return useQuery({
    queryKey: ['sellers', 'detail', id],
    queryFn: () => getSeller(id, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
