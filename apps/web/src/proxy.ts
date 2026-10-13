import { type NextRequest, NextResponse } from 'next/server';
import { ROUTES } from '@/lib/routes';
import {
  parseSessionCookie,
  ROLE_HOME,
  SESSION_COOKIE,
  SESSION_EXPIRED_PARAM,
  type Session,
} from '@/lib/session';
import type { GlobalRole } from '@/types/auth';

// UX-only gate: the API re-checks the signed JWT on every request.
const ROLES_BY_SEGMENT: Record<string, GlobalRole[]> = {
  admin: ['ADMIN'],
  seller: ['SELLER'],
  carrier: ['CARRIER_MANAGER', 'CARRIER_OPERATOR'],
};

function login(request: NextRequest, session: Session | null) {
  // A server render can't clear the cookie of the session it just found expired, so the redirect asks for it here.
  if (request.nextUrl.searchParams.has(SESSION_EXPIRED_PARAM)) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return session
    ? NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url))
    : NextResponse.next();
}

export function proxy(request: NextRequest) {
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const [, segment] = request.nextUrl.pathname.split('/');

  if (segment === 'login') {
    return login(request, session);
  }

  if (!session) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  if (!ROLES_BY_SEGMENT[segment]?.includes(session.role)) {
    return NextResponse.rewrite(new URL(ROUTES.forbidden, request.url), {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/carrier/:path*', '/login'],
};
