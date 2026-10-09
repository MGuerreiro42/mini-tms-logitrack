import { type NextRequest, NextResponse } from 'next/server';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';

// UX-only gate: the API re-checks the signed JWT on every request.
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
