import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/services/api-client';
import type { GlobalRole } from '@/types/auth';
import { parseSessionCookie, SESSION_COOKIE, type Session } from './session';

export const getServerSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
});

// Layouts and pages render in parallel, so each one that fetches calls this itself before touching the API.
export async function requireRole(...roles: GlobalRole[]): Promise<Session> {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (!roles.includes(session.role)) redirect('/forbidden');
  return session;
}

export async function withAuthRedirects<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect('/login');
    }
    if (error instanceof ApiError && error.statusCode === 403) {
      redirect('/forbidden');
    }
    throw error;
  }
}
