import type { PublicTrackingGateway } from './public-tracking.gateway';
import type { TrackingGateway } from './tracking.gateway';
import { TrackingPresence } from './tracking-presence';

describe('TrackingPresence', () => {
  const presenceWith = (authenticated: number, anonymous: number) =>
    new TrackingPresence(
      {
        server: {
          fetchSockets: vi.fn().mockResolvedValue(Array(authenticated)),
        },
      } as unknown as TrackingGateway,
      {
        server: { fetchSockets: vi.fn().mockResolvedValue(Array(anonymous)) },
      } as unknown as PublicTrackingGateway,
    );

  it('reports no viewers when both namespaces are empty', async () => {
    await expect(presenceWith(0, 0).hasViewers()).resolves.toBe(false);
  });

  it('counts a signed-in viewer', async () => {
    await expect(presenceWith(1, 0).hasViewers()).resolves.toBe(true);
  });

  it('counts a public tracking viewer', async () => {
    await expect(presenceWith(0, 2).hasViewers()).resolves.toBe(true);
  });
});
