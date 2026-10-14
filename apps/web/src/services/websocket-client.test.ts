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

  it('waits for a pending handshake before disconnecting', () => {
    const socket = makeFakeSocket();
    socket.active = true;

    retainSocket(socket as never)();
    expect(socket.disconnect).not.toHaveBeenCalled();

    socket.trigger('connect');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects when a pending handshake fails with nobody left', () => {
    const socket = makeFakeSocket();
    socket.active = true;

    retainSocket(socket as never)();
    socket.trigger('connect_error');

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('hands a pending handshake to the consumer that arrives meanwhile', () => {
    const socket = makeFakeSocket();
    socket.active = true;

    retainSocket(socket as never)();
    retainSocket(socket as never);
    socket.trigger('connect');

    expect(socket.disconnect).not.toHaveBeenCalled();
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

describe('reconnectSockets', () => {
  async function freshClient() {
    vi.resetModules();
    return import('./websocket-client');
  }

  it('cycles the idle sockets someone holds and settles once they answer', async () => {
    const { reconnectSockets, retainSocket } = await freshClient();
    const held = makeFakeSocket();
    const released = makeFakeSocket();
    const handshaking = makeFakeSocket();
    handshaking.io.engine.readyState = 'opening';
    retainSocket(held as never);
    retainSocket(released as never)();
    retainSocket(handshaking as never);
    for (const socket of [held, released, handshaking]) {
      socket.connect.mockClear();
      socket.disconnect.mockClear();
    }

    let settled = false;
    const done = reconnectSockets().then(() => {
      settled = true;
    });

    expect(held.disconnect).toHaveBeenCalledTimes(1);
    expect(held.connect).toHaveBeenCalledTimes(1);
    expect(released.connect).not.toHaveBeenCalled();
    expect(handshaking.disconnect).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(settled).toBe(false);

    held.trigger('connect_error');
    await done;
    expect(settled).toBe(true);
  });
});
