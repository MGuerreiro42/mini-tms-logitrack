'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getMyCarrier } from '../api';

export function useMyCarrier() {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'me'],
    queryFn: () => getMyCarrier(session?.token ?? ''),
    enabled: Boolean(session),
  });
}
