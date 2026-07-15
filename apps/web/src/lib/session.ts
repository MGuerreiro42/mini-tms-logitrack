import type { GlobalRole } from '@/features/auth/types';

export const SESSION_COOKIE = 'tms_session';

// 1 day, matching the backend JWT's own expiry (apps/api auth.module.ts) —
// the cookie outliving the token buys nothing, the token itself still gets
// rejected (401) server-side once it expires.
const MAX_AGE_SECONDS = 60 * 60 * 24;

export interface Session {
  token: string;
  role: GlobalRole;
  userId: string;
  email: string;
}

// Pure — safe to call from both server (after reading the raw cookie value
// via next/headers) and client code, since it touches no browser/Node APIs.
export function parseSessionCookie(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token === 'string' && typeof parsed?.role === 'string') {
      return parsed as Session;
    }
    return null;
  } catch {
    return null;
  }
}

// Client-only from here down — never imported by a Server Component/layout,
// which read the cookie via next/headers + parseSessionCookie() instead.

export function setSession(session: Session): void {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// Memoized on the raw cookie string, not just called fresh every time:
// document.cookie has to be re-read on every call (it's the only way to
// notice a real change), but JSON.parse-ing it into a new object even when
// the string is byte-for-byte identical means every consumer of
// useSession() gets a different object reference on every render — a
// footgun for any effect/memo that puts the session in a dependency array
// (this bit useShipmentTracking's WebSocket lifecycle: an unrelated
// re-render looked like "the session changed" and tore the socket down and
// reconnected it for no reason). Comparing the raw string first means an
// unchanged cookie returns the exact same object every time; a real change
// (login/logout, a different user) still re-parses and returns a new one
// immediately.
let lastRawCookieValue: string | undefined;
let lastParsedSession: Session | null = null;

export function getSessionFromDocument(): Session | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  const raw = match
    ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1))
    : undefined;

  if (raw === lastRawCookieValue) {
    return lastParsedSession;
  }

  lastRawCookieValue = raw;
  lastParsedSession = parseSessionCookie(raw);
  return lastParsedSession;
}
