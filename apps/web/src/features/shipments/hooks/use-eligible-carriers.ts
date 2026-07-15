'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getEligibleCarriers } from '../api';

export function useEligibleCarriers(
  state: string,
  city: string,
  modalityId: string,
) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'eligible-carriers', state, city, modalityId],
    queryFn: () =>
      getEligibleCarriers(state, city, modalityId, session?.token ?? ''),
    enabled:
      Boolean(session) &&
      Boolean(state) &&
      Boolean(city) &&
      Boolean(modalityId),
  });
}
