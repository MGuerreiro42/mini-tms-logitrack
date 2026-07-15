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

  it('leaves the session untouched for a non-401/403 query error', async () => {
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

  it('clears the session and redirects to /login on a 403 query error (role-mismatched session, e.g. a shared-cookie-jar tab)', async () => {
    const client = getQueryClient();

    await client
      .fetchQuery({
        queryKey: ['test-403-query'],
        queryFn: () => Promise.reject(new ApiError(403, 'Forbidden')),
      })
      .catch(() => {});

    expect(document.cookie).not.toContain('tms_session=signed');
    expect(window.location.href).toBe('/login');
  });

  it('clears the session and redirects to /login on a 401 mutation error (handleMutationError is a separate function from handleQueryError — needs its own coverage)', async () => {
    const client = getQueryClient();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(new ApiError(401, 'Token expired')),
    });

    await mutation.execute(undefined).catch(() => {});

    expect(document.cookie).not.toContain('tms_session=signed');
    expect(window.location.href).toBe('/login');
  });

  it('does NOT clear the session on a 403 mutation error (a legitimate ownership rejection, not a broken session)', async () => {
    const client = getQueryClient();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () =>
        Promise.reject(
          new ApiError(
            403,
            'Only the shipment owner or the carrier manager can update its status',
          ),
        ),
    });

    await mutation.execute(undefined).catch(() => {});

    expect(document.cookie).toContain('tms_session=');
    expect(window.location.href).toBe('');
  });
});
