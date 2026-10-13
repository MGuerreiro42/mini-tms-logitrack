import { ROUTES } from '@/lib/routes';
import type { GlobalRole } from '@/types/auth';

export const SESSION_COOKIE = 'tms_session';
export const SESSION_CHANNEL = 'tms-session';
export const SESSION_EXPIRED_PARAM = 'expired';
export const SESSION_EXPIRED_PATH = `${ROUTES.login}?${SESSION_EXPIRED_PARAM}=1`;

export type Segment = 'admin' | 'seller' | 'carrier';

export const SEGMENT_ROLES: Record<Segment, readonly GlobalRole[]> = {
  admin: ['ADMIN'],
  seller: ['SELLER'],
  carrier: ['CARRIER_MANAGER', 'CARRIER_OPERATOR'],
};

export const ROLE_HOME = Object.fromEntries(
  Object.entries(SEGMENT_ROLES).flatMap(([segment, roles]) =>
    roles.map((role) => [role, `/${segment}`]),
  ),
) as Record<GlobalRole, string>;

export function canEnterSegment(role: GlobalRole, segment: string): boolean {
  return (
    Object.hasOwn(SEGMENT_ROLES, segment) &&
    SEGMENT_ROLES[segment as Segment].includes(role)
  );
}

export function isCarrierRole(role: GlobalRole): boolean {
  return SEGMENT_ROLES.carrier.includes(role);
}

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
