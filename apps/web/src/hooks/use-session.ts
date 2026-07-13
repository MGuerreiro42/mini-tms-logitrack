'use client';

import { getSessionFromDocument, type Session } from '@/lib/session';

// Deliberately simple, no context/provider: reads document.cookie fresh on
// every call. The QueryClient's global 401 handler (lib/query-client.ts) is
// what actually reacts to a session going stale mid-use — this hook is just
// a thin, consistent way for feature hooks to grab the current token/role.
export function useSession(): Session | null {
  if (typeof document === 'undefined') return null;
  return getSessionFromDocument();
}
