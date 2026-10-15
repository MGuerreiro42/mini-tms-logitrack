'use client';

import { useCallback, useState } from 'react';
import { useNow } from './use-now';

const TICK_MS = 5_000;

export function useRecentCount(windowMs: number) {
  const [stamps, setStamps] = useState<number[]>([]);
  const since = useNow(TICK_MS).getTime() - windowMs;

  const record = useCallback(() => {
    const now = Date.now();
    setStamps((current) => [
      ...current.filter((stamp) => stamp > now - windowMs),
      now,
    ]);
  }, [windowMs]);

  return {
    count: stamps.filter((stamp) => stamp > since).length,
    record,
  };
}
