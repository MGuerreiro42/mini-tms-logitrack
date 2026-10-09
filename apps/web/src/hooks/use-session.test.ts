import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { setSession } from '@/lib/session';
import { useSession } from './use-session';

describe('useSession', () => {
  beforeEach(() => {
    document.cookie = 'tms_session=; path=/; max-age=0';
  });

  it('returns null when no session cookie is set', () => {
    const { result } = renderHook(() => useSession());

    expect(result.current).toBeNull();
  });

  it('returns the parsed session when a cookie is set', () => {
    setSession({
      token: 'signed.jwt.token',
      role: 'ADMIN',
      userId: 'user-1',
      email: 'admin@example.com',
    });

    const { result } = renderHook(() => useSession());

    expect(result.current).toEqual({
      token: 'signed.jwt.token',
      role: 'ADMIN',
      userId: 'user-1',
      email: 'admin@example.com',
    });
  });

  it('renders signed-out on the server so hydration matches', () => {
    setSession({
      token: 'signed.jwt.token',
      role: 'ADMIN',
      userId: 'user-1',
      email: 'admin@example.com',
    });
    function Email() {
      return createElement('span', null, useSession()?.email ?? 'anonymous');
    }

    expect(renderToString(createElement(Email))).toContain('anonymous');
  });
});
