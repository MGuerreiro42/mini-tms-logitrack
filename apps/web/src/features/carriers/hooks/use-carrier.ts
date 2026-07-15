'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getCarrier } from '../api';

export function useCarrier(id: string) {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'detail', id],
    queryFn: () => getCarrier(id, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
