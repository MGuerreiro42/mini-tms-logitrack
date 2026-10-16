import {
  canEnterSegment,
  clearSession,
  forbiddenPath,
  getSessionFromDocument,
  isCarrierRole,
  onSessionChangedElsewhere,
  parseSessionCookie,
  ROLE_HOME,
  SESSION_CHANNEL,
  type Session,
  setSession,
} from './session';

describe('parseSessionCookie', () => {
  const session: Session = {
    token: 'signed.jwt.token',
    role: 'SELLER',
    userId: 'user-1',
    email: 'seller@example.com',
  };

  it('parses a valid raw cookie value', () => {
    expect(parseSessionCookie(JSON.stringify(session))).toEqual(session);
  });

  it('returns null for undefined', () => {
    expect(parseSessionCookie(undefined)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseSessionCookie('{not json')).toBeNull();
  });

  it('returns null when token or role is missing', () => {
    expect(parseSessionCookie(JSON.stringify({ userId: 'user-1' }))).toBeNull();
  });

  it('returns null for a role the app does not know', () => {
    expect(
      parseSessionCookie(JSON.stringify({ ...session, role: 'ROOT' })),
    ).toBeNull();
  });
});

describe('segments', () => {
  it.each([
    ['ADMIN', 'admin', '/admin'],
    ['SELLER', 'seller', '/seller'],
    ['CARRIER_MANAGER', 'carrier', '/carrier/queue'],
    ['CARRIER_OPERATOR', 'carrier', '/carrier/queue'],
  ] as const)(
    'sends %s home inside its own segment /%s',
    (role, segment, home) => {
      expect(ROLE_HOME[role]).toBe(home);
      expect(canEnterSegment(role, segment)).toBe(true);
    },
  );

  it.each([
    ['SELLER', 'admin'],
    ['CARRIER_OPERATOR', 'seller'],
    ['ADMIN', 'carrier'],
    ['ADMIN', 'login'],
    ['ADMIN', 'constructor'],
  ] as const)('keeps %s out of /%s', (role, segment) => {
    expect(canEnterSegment(role, segment)).toBe(false);
  });

  it('names the area on the 403 path only for a known segment', () => {
    expect(forbiddenPath('carrier')).toBe('/forbidden?area=carrier');
    expect(forbiddenPath('constructor')).toBe('/forbidden');
  });

  it('treats managers and operators as carrier roles', () => {
    expect(isCarrierRole('CARRIER_MANAGER')).toBe(true);
    expect(isCarrierRole('CARRIER_OPERATOR')).toBe(true);
    expect(isCarrierRole('SELLER')).toBe(false);
  });
});

describe('setSession / getSessionFromDocument / clearSession', () => {
  const session: Session = {
    token: 'signed.jwt.token',
    role: 'CARRIER_MANAGER',
    userId: 'user-1',
    email: 'manager@example.com',
  };

  beforeEach(() => {
    document.cookie = 'tms_session=; path=/; max-age=0';
  });

  it('round-trips a session through the cookie', () => {
    setSession(session);

    expect(getSessionFromDocument()).toEqual(session);
  });

  it('returns null when no session cookie is set', () => {
    expect(getSessionFromDocument()).toBeNull();
  });

  it('clearSession removes the session', () => {
    setSession(session);
    clearSession();

    expect(getSessionFromDocument()).toBeNull();
  });

  it('returns the same object reference across calls when the cookie is unchanged (regression: consumers that put the session in a dependency array must not see a spurious change)', () => {
    setSession(session);

    const first = getSessionFromDocument();
    const second = getSessionFromDocument();

    expect(first).toBe(second);
  });

  it('returns a new object once the cookie actually changes', () => {
    setSession(session);
    const first = getSessionFromDocument();

    setSession({ ...session, token: 'a-different-token' });
    const second = getSessionFromDocument();

    expect(second).not.toBe(first);
    expect(second?.token).toBe('a-different-token');
  });
});

describe('cross-tab session changes', () => {
  const session: Session = {
    token: 'signed.jwt.token',
    role: 'SELLER',
    userId: 'user-1',
    email: 'seller@example.com',
  };
  let otherTab: BroadcastChannel;

  beforeEach(() => {
    otherTab = new BroadcastChannel(SESSION_CHANNEL);
  });

  afterEach(() => {
    otherTab.close();
  });

  it.each([
    ['login', () => setSession(session)],
    ['logout', () => clearSession()],
  ])('announces a %s to other tabs but not to its own', async (_, change) => {
    const ownListener = vi.fn();
    const stop = onSessionChangedElsewhere(ownListener);
    const heardElsewhere = vi.fn();
    otherTab.addEventListener('message', heardElsewhere);

    change();

    await vi.waitFor(() => expect(heardElsewhere).toHaveBeenCalledTimes(1));
    expect(ownListener).not.toHaveBeenCalled();
    stop();
  });

  it('hears a change made in another tab', async () => {
    const listener = vi.fn();
    const stop = onSessionChangedElsewhere(listener);

    otherTab.postMessage(null);

    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    stop();
  });
});
