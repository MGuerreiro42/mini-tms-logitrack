import type { GlobalRole } from '@/types/auth';

export const SESSION_COOKIE = 'tms_session';

const MAX_AGE_SECONDS = 60 * 60 * 24;

export interface Session {
  token: string;
  role: GlobalRole;
  userId: string;
  email: string;
}

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

export function setSession(session: Session): void {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// Memoized on the raw cookie: useSyncExternalStore needs a stable snapshot while it is unchanged.
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
