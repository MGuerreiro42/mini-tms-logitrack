import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type {
  ShipmentActivity,
  ShipmentStatus,
} from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { API_URL, HOUR_MS } from './overview.fixtures';
import { RecentUpdates } from './recent-updates';

function event(
  id: string,
  status: ShipmentStatus,
  hoursAgo: number,
  dueHoursAgo: number | null = null,
): ShipmentActivity {
  const at = (hours: number) =>
    new Date(Date.now() - hours * HOUR_MS).toISOString();
  return {
    id,
    shipmentId: `shipment-${id}`,
    trackingCode: `TMS-${id.toUpperCase()}`,
    status,
    city: 'Bauru',
    dueAt: dueHoursAgo === null ? null : at(dueHoursAgo),
    createdAt: at(hoursAgo),
  };
}

describe('RecentUpdates', () => {
  beforeEach(() => {
    setSession({ token: 't', role: 'SELLER', userId: 'u', email: 'a@b.c' });
    server.use(
      http.get(`${API_URL}/shipments/activity`, () =>
        HttpResponse.json([
          event('moved', 'IN_TRANSIT', 0.2),
          event('late', 'DELIVERED', 0.5, 3.5),
          event('failed', 'FAILED_DELIVERY', 2),
        ]),
      ),
    );
  });

  it('reads each change, and a delivery with its verdict, by hour', async () => {
    renderWithQueryClient(
      <RecentUpdates
        live={{ status: 'live', lastEventAt: null }}
        poll={() => false}
      />,
    );

    const lastHour = await screen.findByRole('list', { name: 'Last hour 2' });
    const [moved, late] = within(lastHour).getAllByRole('link');
    expect(moved).toHaveTextContent('Collected → In transit · Bauru');
    expect(late).toHaveTextContent('Delivered · Late by 3 h · Bauru');
    expect(
      within(screen.getByRole('list', { name: 'Earlier today 1' })).getByRole(
        'link',
      ),
    ).toHaveTextContent('Failed delivery · Bauru');
  });

  it('keeps no separate minute clock for the strip', async () => {
    const timers = vi.spyOn(globalThis, 'setInterval');
    renderWithQueryClient(
      <RecentUpdates
        live={{ status: 'live', lastEventAt: null }}
        poll={() => false}
      />,
    );
    await screen.findByRole('list', { name: 'Last hour 2' });

    const delays = timers.mock.calls.map(([, delay]) => delay);
    // The strip no longer keeps a minute clock beside the feed's.
    expect(delays).not.toContain(60_000);
    timers.mockRestore();
  });

  it('draws the last 4 hours as one tick per event, failures named', async () => {
    renderWithQueryClient(
      <RecentUpdates
        live={{ status: 'live', lastEventAt: null }}
        poll={() => false}
      />,
    );

    expect(
      await screen.findByRole('img', {
        name: '3 events in the last 4 hours, 1 failed delivery',
      }),
    ).toBeVisible();
    expect(screen.getByText('Last 4 hours · 3 events')).toBeVisible();
  });
});
