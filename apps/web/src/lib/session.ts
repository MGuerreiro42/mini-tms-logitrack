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

export function getSessionFromDocument(): Session | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return parseSessionCookie(raw);
}
