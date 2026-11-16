import type { PublicTrackingGateway } from './public-tracking.gateway';
import type { TrackingGateway } from './tracking.gateway';
import { TrackingPresence } from './tracking-presence';

describe('TrackingPresence', () => {
  const fetchSockets = vi.fn();
  const presenceWith = (authenticated: number, anonymous: number) => {
    fetchSockets.mockReset();
    fetchSockets
      .mockResolvedValueOnce(Array(authenticated))
      .mockResolvedValueOnce(Array(anonymous));
    return new TrackingPresence(
      { server: { fetchSockets } } as unknown as TrackingGateway,
      { server: { fetchSockets } } as unknown as PublicTrackingGateway,
    );
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports no viewers when both namespaces are empty', async () => {
    await expect(presenceWith(0, 0).hasViewers()).resolves.toBe(false);
  });

  it('counts a signed-in viewer', async () => {
    await expect(presenceWith(1, 0).hasViewers()).resolves.toBe(true);
  });

  it('counts a public tracking viewer', async () => {
    await expect(presenceWith(0, 2).hasViewers()).resolves.toBe(true);
  });

  it('counts the sockets of each namespace', async () => {
    await expect(presenceWith(3, 2).socketCounts()).resolves.toEqual({
      internal: 3,
      public: 2,
    });
  });

  it('reuses an answer for 5 s', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const presence = presenceWith(0, 0);
    await presence.hasViewers();

    vi.advanceTimersByTime(4_999);
    await presence.hasViewers();
    expect(fetchSockets).toHaveBeenCalledTimes(2);

    fetchSockets.mockResolvedValue([{}]);
    vi.advanceTimersByTime(1);
    await expect(presence.hasViewers()).resolves.toBe(true);
    expect(fetchSockets).toHaveBeenCalledTimes(4);
  });

  it('asks again as soon as a viewer connects', async () => {
    const presence = presenceWith(0, 0);
    await presence.hasViewers();
    fetchSockets.mockResolvedValue([{}]);

    presence.forget();

    await expect(presence.hasViewers()).resolves.toBe(true);
  });
});
