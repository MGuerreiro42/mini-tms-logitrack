import { io } from 'socket.io-client';
import { getSessionFromDocument } from '@/lib/session';
import { makeFakeSocket } from '@/test/fake-socket';
import { getPublicSocket, getSocket, retainSocket } from './websocket-client';

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

describe('retainSocket', () => {
  it('connects for the first consumer only', () => {
    const socket = makeFakeSocket();

    retainSocket(socket as never);
    retainSocket(socket as never);

    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects only when the last consumer releases', () => {
    const socket = makeFakeSocket();
    const releaseFirst = retainSocket(socket as never);
    const releaseSecond = retainSocket(socket as never);

    releaseFirst();
    expect(socket.disconnect).not.toHaveBeenCalled();

    releaseSecond();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ignores a repeated release from the same consumer', () => {
    const socket = makeFakeSocket();
    const releaseFirst = retainSocket(socket as never);
    retainSocket(socket as never);

    releaseFirst();
    releaseFirst();

    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('reconnects when a consumer returns after the last release', () => {
    const socket = makeFakeSocket();

    retainSocket(socket as never)();
    retainSocket(socket as never);

    expect(socket.connect).toHaveBeenCalledTimes(2);
  });
});
