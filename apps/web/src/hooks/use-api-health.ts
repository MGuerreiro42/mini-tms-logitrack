'use client';

import { useEffect, useState } from 'react';
import { apiClient, isServiceUnavailable } from '@/services/api-client';

export type ApiHealth = 'checking' | 'up' | 'down';

const HEALTH_TIMEOUT_MS = 5000;

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    let active = true;
    apiClient('/health', {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
      .then(
        (): ApiHealth => 'up',
        (error): ApiHealth => (isServiceUnavailable(error) ? 'down' : 'up'),
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
