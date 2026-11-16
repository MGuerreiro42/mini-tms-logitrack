'use client';

import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { type Throttled, throttle } from '@/lib/throttle';

// A refetch of queryKey at most once per waitMs, the trailing one dropped on unmount.
export function useThrottledInvalidation(
  queryKey: QueryKey,
  waitMs: number,
): Throttled {
  const queryClient = useQueryClient();
  const [invalidate] = useState(() =>
    throttle(() => queryClient.invalidateQueries({ queryKey }), waitMs),
  );

  useEffect(() => invalidate.cancel, [invalidate]);

  return invalidate;
}
