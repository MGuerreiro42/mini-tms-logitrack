'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api-url';

export type ApiHealth = 'checking' | 'up' | 'down';

const HEALTH_TIMEOUT_MS = 5000;

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
      .then(
        (response): ApiHealth => (response.ok ? 'up' : 'down'),
        (): ApiHealth => 'down',
      )
      .then((result) => {
        if (active) setHealth(result);
      });
    return () => {
      active = false;
    };
  }, []);

  return health;
}
