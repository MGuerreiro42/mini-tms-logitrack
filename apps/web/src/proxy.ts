import { type NextRequest, NextResponse } from 'next/server';
import { parseSessionCookie, SESSION_COOKIE } from '@/lib/session';
import type { GlobalRole } from '@/types/auth';

// UX-only gate: the API re-checks the signed JWT on every request.
const ROLES_BY_SEGMENT: Record<string, GlobalRole[]> = {
  admin: ['ADMIN'],
  seller: ['SELLER'],
  carrier: ['CARRIER_MANAGER', 'CARRIER_OPERATOR'],
};

export function proxy(request: NextRequest) {
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const [, segment] = request.nextUrl.pathname.split('/');
  if (!ROLES_BY_SEGMENT[segment]?.includes(session.role)) {
    return NextResponse.rewrite(new URL('/forbidden', request.url), {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/carrier/:path*'],
};
