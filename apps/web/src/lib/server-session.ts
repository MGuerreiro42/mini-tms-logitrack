import { cookies } from 'next/headers';
import { parseSessionCookie, SESSION_COOKIE, type Session } from './session';

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
}
