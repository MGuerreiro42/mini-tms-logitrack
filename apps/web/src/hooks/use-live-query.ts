'use client';

import {
  keepPreviousData,
  type QueryKey,
  useQuery,
} from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';

interface LiveQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: (token: string) => Promise<T>;
  liveStatus: LiveStatus;
  keepPrevious?: boolean;
}

export function useLiveQuery<T>({
  queryKey,
  queryFn,
  liveStatus,
  keepPrevious = false,
}: LiveQueryOptions<T>) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey,
    queryFn: () => queryFn(token),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
