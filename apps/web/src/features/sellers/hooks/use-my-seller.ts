'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getMySeller } from '../api';

export function useMySeller() {
  const session = useSession();

  return useQuery({
    queryKey: ['sellers', 'me'],
    queryFn: () => getMySeller(session?.token ?? ''),
    enabled: Boolean(session),
  });
}
