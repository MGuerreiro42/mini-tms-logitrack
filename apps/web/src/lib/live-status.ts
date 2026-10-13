export type LiveStatus = 'connecting' | 'live' | 'offline';

const FALLBACK_POLL_MS = 5000;

export function fallbackPollInterval(status: LiveStatus): number | false {
  return status === 'live' ? false : FALLBACK_POLL_MS;
}
