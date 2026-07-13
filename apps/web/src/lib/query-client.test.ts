import { setSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';
import { getQueryClient } from './query-client';

describe('getQueryClient (browser)', () => {
  it('reuses the same QueryClient instance across calls', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});

describe('getQueryClient (server)', () => {
  it('returns a new instance every call — no cross-request state leakage', async () => {
    vi.resetModules();
    vi.doMock('@tanstack/react-query', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@tanstack/react-query')>()),
      isServer: true,
    }));

    const { getQueryClient: getServerQueryClient } = await import(
      './query-client'
    );

    expect(getServerQueryClient()).not.toBe(getServerQueryClient());

    vi.doUnmock('@tanstack/react-query');
    vi.resetModules();
  });
});

describe('global 401 handling', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    document.cookie = 'tms_session=; path=/; max-age=0';
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('clears the session and redirects to /login on a 401', async () => {
    const client = getQueryClient();

    await client
      .fetchQuery({
        queryKey: ['test-401'],
        queryFn: () => Promise.reject(new ApiError(401, 'Token expired')),
      })
      .catch(() => {});

    expect(document.cookie).not.toContain('tms_session=signed');
    expect(window.location.href).toBe('/login');
  });

  it('leaves the session untouched for a non-401 error', async () => {
    const client = getQueryClient();

    await client
      .fetchQuery({
        queryKey: ['test-404'],
        queryFn: () => Promise.reject(new ApiError(404, 'Not found')),
      })
      .catch(() => {});

    expect(document.cookie).toContain('tms_session=');
    expect(window.location.href).toBe('');
  });
});
