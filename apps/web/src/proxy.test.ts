import { NextRequest } from 'next/server';
import { SESSION_COOKIE, type Session } from '@/lib/session';
import type { GlobalRole } from '@/types/auth';
import { proxy } from './proxy';

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
    ['/admin', 'SELLER'],
    ['/admin/monitoring', 'CARRIER_MANAGER'],
    ['/seller/shipments/new', 'CARRIER_OPERATOR'],
    ['/carrier/queue', 'SELLER'],
  ] as const)('answers %s with the 403 page for %s, keeping the session', (path, role) => {
    const response = proxy(request(path, role));

    expect(response.status).toBe(403);
    expect(rewriteTarget(response)).toBe('http://localhost/forbidden');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
