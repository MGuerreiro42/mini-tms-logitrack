import { io } from 'socket.io-client';
import { getSessionFromDocument } from '@/lib/session';
import { getPublicSocket, getSocket } from './websocket-client';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({})) }));
vi.mock('@/lib/session', () => ({ getSessionFromDocument: vi.fn() }));

describe('getSocket', () => {
  it('creates the socket only once (module-level singleton)', () => {
    vi.mocked(io).mockClear();

    const first = getSocket();
    const second = getSocket();

    expect(io).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('the auth callback reads the current session token, not a captured one', () => {
    vi.mocked(getSessionFromDocument).mockReturnValue({
      token: 'first-token',
      role: 'SELLER',
      userId: 'u',
      email: 'e',
    });
    const [, options] = vi.mocked(io).mock.calls[0];
    const auth = (options as { auth: (cb: (data: object) => void) => void })
      .auth;

    const firstCb = vi.fn();
    auth(firstCb);
    expect(firstCb).toHaveBeenCalledWith({ token: 'first-token' });

    vi.mocked(getSessionFromDocument).mockReturnValue({
      token: 'refreshed-token',
      role: 'SELLER',
      userId: 'u',
      email: 'e',
    });
    const secondCb = vi.fn();
    auth(secondCb);
    expect(secondCb).toHaveBeenCalledWith({ token: 'refreshed-token' });
  });
});

describe('getPublicSocket', () => {
  it('connects to the /public namespace over websocket without auth', () => {
    vi.mocked(io).mockClear();

    const socket = getPublicSocket();

    expect(getPublicSocket()).toBe(socket);
    expect(io).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(io).mock.calls[0];
    expect(url).toBe('http://localhost:3333/public');
    expect(options).toMatchObject({ transports: ['websocket'] });
    expect(options).not.toHaveProperty('auth');
  });
});
