import {
  clearSession,
  getSessionFromDocument,
  parseSessionCookie,
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
});
