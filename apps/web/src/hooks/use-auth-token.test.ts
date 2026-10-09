import { renderHook } from '@testing-library/react';
import { clearSession, setSession } from '@/lib/session';
import { useAuthToken } from './use-auth-token';

describe('useAuthToken', () => {
  it('is disabled without a session', () => {
    clearSession();
    const { result } = renderHook(() => useAuthToken());
    expect(result.current).toEqual({ token: '', enabled: false });
  });

  it('returns the session token once signed in', () => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'e' });
    const { result } = renderHook(() => useAuthToken());
    expect(result.current).toEqual({ token: 't', enabled: true });
  });
});
