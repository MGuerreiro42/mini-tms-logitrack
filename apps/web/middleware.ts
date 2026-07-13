import { type NextRequest, NextResponse } from 'next/server';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';

// This is a coarse, UX-only gate — a user can freely edit this cookie via
// devtools, and that gains them nothing: every real check happens again, for
// real, against the signed JWT in NestJS's JwtAuthGuard/RolesGuard/@Roles(),
// which never trusts anything this middleware decided. It exists purely so
// a legitimate, unmodified session doesn't land on a route that will 403
// everywhere, not to stop anyone malicious.
const ROLE_BY_PREFIX: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/seller': ['SELLER'],
  '/carrier': ['CARRIER_MANAGER', 'CARRIER_OPERATOR'],
};

export function middleware(request: NextRequest) {
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const [, prefix] = request.nextUrl.pathname.match(/^(\/[^/]+)/) ?? [];
  const allowedRoles = prefix ? ROLE_BY_PREFIX[prefix] : undefined;
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/carrier/:path*'],
};
