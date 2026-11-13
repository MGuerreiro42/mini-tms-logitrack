import { act, renderHook } from '@testing-library/react';
import { setSession } from '@/lib/session';
import { rememberRecent, useRecents } from './use-recents';

const signIn = (userId: string) =>
  setSession({ token: 't', role: 'SELLER', userId, email: 'e' });

const entry = (n: number) => ({
  href: `/seller/shipments/${n}`,
  code: `C${n}`,
});

describe('useRecents', () => {
  it('keeps the newest first, without duplicates, capped at 5', () => {
    signIn('u1');
    const { result } = renderHook(() => useRecents());
    act(() => {
      for (const n of [1, 2, 3, 4, 5, 6]) rememberRecent(entry(n));
      rememberRecent(entry(4));
    });

    expect(result.current.map((recent) => recent.code)).toEqual([
      'C4',
      'C6',
      'C5',
      'C3',
      'C2',
    ]);
  });

  it('keeps each user their own list', () => {
    signIn('u1');
    act(() => rememberRecent(entry(1)));
    signIn('u2');
    const { result } = renderHook(() => useRecents());

    expect(result.current).toEqual([]);
    expect(localStorage.getItem('tms:recents:u1')).toContain('C1');
  });

  it('ignores stored entries that are not in-app links', () => {
    signIn('u1');
    localStorage.setItem(
      'tms:recents:u1',
      JSON.stringify([{ href: 'javascript:alert(1)', code: 'X' }, entry(1)]),
    );
    const { result } = renderHook(() => useRecents());
    expect(result.current).toEqual([entry(1)]);
  });

  it('lasts for the session when storage is blocked', () => {
    signIn('u1');
    const blocked = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useRecents());
    act(() => rememberRecent(entry(1)));

    expect(result.current).toEqual([entry(1)]);
    blocked.mockRestore();
    vi.restoreAllMocks();
  });
});
