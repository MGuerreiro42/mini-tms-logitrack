import { NextRequest } from 'next/server';
import { SEGMENT_ROLES, SESSION_COOKIE, type Session } from '@/lib/session';
import type { GlobalRole } from '@/types/auth';
import { config, proxy } from './proxy';

const HOMES = [
  ['ADMIN', '/admin'],
  ['SELLER', '/seller'],
  ['CARRIER_OPERATOR', '/carrier/queue'],
] as const;

function request(path: string, role?: GlobalRole) {
  const session: Session | undefined = role && {
    token: 't',
    role,
    userId: 'u',
    email: 'e',
  };
  return new NextRequest(`http://localhost${path}`, {
    headers: session
      ? {
          cookie: `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}`,
        }
      : undefined,
  });
}

function rewriteTarget(response: Response) {
  return response.headers.get('x-middleware-rewrite');
}

describe('proxy', () => {
  it('guards every role segment', () => {
    for (const segment of Object.keys(SEGMENT_ROLES)) {
      expect(config.matcher).toContain(`/${segment}/:path*`);
    }
  });

  it('sends an anonymous visitor to the login page', () => {
    const response = proxy(request('/seller/shipments'));

    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it.each([
    ['/admin/monitoring', 'ADMIN'],
    ['/seller/shipments/new', 'SELLER'],
    ['/carrier/queue', 'CARRIER_MANAGER'],
    ['/carrier/queue', 'CARRIER_OPERATOR'],
  ] as const)('lets %s through for %s', (path, role) => {
    const response = proxy(request(path, role));

    expect(response.status).toBe(200);
    expect(rewriteTarget(response)).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });

  it.each([
    ['/seller/profile', 'SELLER'],
    ['/admin', 'SELLER'],
  ] as const)('keeps %s out of the browser cache', (path, role) => {
    const response = proxy(request(path, role));

    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    ['/admin', 'SELLER', 'http://localhost/forbidden?area=admin'],
    [
      '/admin/monitoring',
      'CARRIER_MANAGER',
      'http://localhost/forbidden?area=admin',
    ],
    [
      '/seller/shipments/new',
      'CARRIER_OPERATOR',
      'http://localhost/forbidden?area=seller',
    ],
    ['/carrier/queue', 'SELLER', 'http://localhost/forbidden?area=carrier'],
  ] as const)('answers %s with the 403 page for %s, keeping the session', (path, role, target) => {
    const response = proxy(request(path, role));

    expect(response.status).toBe(403);
    expect(rewriteTarget(response)).toBe(target);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('shows the login page to an anonymous visitor', () => {
    const response = proxy(request('/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it.each(
    HOMES,
  )('sends a signed-in %s from the login page to %s', (role, home) => {
    const response = proxy(request('/login', role));

    expect(response.headers.get('location')).toBe(`http://localhost${home}`);
  });

  it('drops an expired session at the login page instead of bouncing it home', () => {
    const response = proxy(request('/login?expired=1', 'SELLER'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('set-cookie')).toMatch(
      /^tms_session=;.*Expires=Thu, 01 Jan 1970/,
    );
  });
});
