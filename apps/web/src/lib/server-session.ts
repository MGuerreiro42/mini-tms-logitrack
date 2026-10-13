import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { HTTP_STATUS } from '@/lib/http-status';
import { ROUTES } from '@/lib/routes';
import { hasStatus } from '@/services/api-client';
import {
  canEnterSegment,
  parseSessionCookie,
  SESSION_COOKIE,
  SESSION_EXPIRED_PATH,
  type Segment,
  type Session,
} from './session';

export const getServerSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
});

// Layouts and pages render in parallel, so each one that fetches calls this itself before touching the API.
export async function requireSegment(segment: Segment): Promise<Session> {
  const session = await getServerSession();
  if (!session) redirect(ROUTES.login);
  if (!canEnterSegment(session.role, segment)) redirect(ROUTES.forbidden);
  return session;
}

export async function withAuthRedirects<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (hasStatus(error, HTTP_STATUS.UNAUTHORIZED)) {
      redirect(SESSION_EXPIRED_PATH);
    }
    if (hasStatus(error, HTTP_STATUS.FORBIDDEN)) {
      redirect(ROUTES.forbidden);
    }
    throw error;
  }
}
