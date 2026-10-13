import { type NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib/http-status';
import { ROUTES } from '@/lib/routes';
import {
  canEnterSegment,
  parseSessionCookie,
  ROLE_HOME,
  SESSION_COOKIE,
  SESSION_EXPIRED_PARAM,
  type Session,
} from '@/lib/session';

// Explicit, so Back after logout can't restore a role page even if it stops rendering dynamically.
function uncached(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

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

// UX-only gate: the API re-checks the signed JWT on every request.
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

  if (!canEnterSegment(session.role, segment)) {
    return uncached(
      NextResponse.rewrite(new URL(ROUTES.forbidden, request.url), {
        status: HTTP_STATUS.FORBIDDEN,
      }),
    );
  }

  return uncached(NextResponse.next());
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/carrier/:path*', '/login'],
};
