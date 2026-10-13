import type { GlobalRole } from '@/types/auth';

export const SESSION_COOKIE = 'tms_session';
export const SESSION_CHANNEL = 'tms-session';
export const SESSION_EXPIRED_PARAM = 'expired';
export const SESSION_EXPIRED_PATH = `/login?${SESSION_EXPIRED_PARAM}=1`;

export const ROLE_HOME: Record<GlobalRole, string> = {
  ADMIN: '/admin',
  SELLER: '/seller',
  CARRIER_MANAGER: '/carrier',
  CARRIER_OPERATOR: '/carrier',
};

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
    const isSession =
      typeof parsed?.token === 'string' &&
      Object.hasOwn(ROLE_HOME, parsed.role);
    return isSession ? (parsed as Session) : null;
  } catch {
    return null;
  }
}

let channel: BroadcastChannel | undefined;

// One shared instance: a BroadcastChannel never hears its own posts, so only other tabs are told.
function sessionChannel(): BroadcastChannel {
  channel ??= new BroadcastChannel(SESSION_CHANNEL);
  return channel;
}

export function onSessionChangedElsewhere(listener: () => void): () => void {
  const source = sessionChannel();
  source.addEventListener('message', listener);
  return () => source.removeEventListener('message', listener);
}

export function setSession(session: Session): void {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
  sessionChannel().postMessage(null);
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  sessionChannel().postMessage(null);
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
