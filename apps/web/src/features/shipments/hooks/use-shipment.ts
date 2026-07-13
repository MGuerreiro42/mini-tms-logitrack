'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getShipment } from '../api';

export function useShipment(id: string) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'detail', id],
    queryFn: () => getShipment(id, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
