import { isClientError } from '@/services/api-client';

export type LiveStatus = 'connecting' | 'live' | 'offline';

const FALLBACK_POLL_MS = 5000;

export function fallbackPollInterval(status: LiveStatus) {
  return (query: { state: { error: unknown } }): number | false =>
    status === 'live' || isClientError(query.state.error)
      ? false
      : FALLBACK_POLL_MS;
}
