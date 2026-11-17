import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { WebhookHealth } from '@/features/integrations/types';
import type {
  ShipmentActivity,
  ShipmentStatus,
} from '@/features/shipments/types';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import {
  API_URL,
  attention,
  HOUR_MS,
  sellerMetrics,
  shipment,
} from './overview.fixtures';
import { SellerDashboard } from './seller-dashboard';

// jsdom has no ResizeObserver, and its absence also keeps auto-animate off.
vi.mock('@/hooks/use-element-width', () => ({
  useElementWidth: () => [{ current: null }, undefined],
}));
vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const failed = shipment('failed', 'FAILED_DELIVERY', -6);
const late = shipment('late', 'IN_TRANSIT', -5);

const counts = {
  PENDING: 1,
  ACCEPTED: 0,
  COLLECTED: 0,
  IN_TRANSIT: 1,
  OUT_FOR_DELIVERY: 0,
  DELIVERED: 9,
  FAILED_DELIVERY: 1,
  CANCELLED: 0,
  RETURNED: 0,
};

function activity(id: string, status: ShipmentStatus): ShipmentActivity {
  return {
    id,
    shipmentId: `shipment-${id}`,
    trackingCode: `TMS-${id.toUpperCase()}`,
    status,
    city: 'Bauru',
    dueAt: null,
    createdAt: new Date().toISOString(),
  };
}

const collected = activity('collected', 'COLLECTED');
const delivered = activity('delivered', 'DELIVERED');

const useMetrics = (metrics = sellerMetrics()) =>
  server.use(
    http.get(`${API_URL}/shipments/metrics`, () => HttpResponse.json(metrics)),
  );

describe('SellerDashboard', () => {
  let metricsUrls: URL[] = [];
  let webhookHealth: WebhookHealth;

  beforeEach(() => {
    metricsUrls = [];
    webhookHealth = {
      state: 'ok',
      n: 20,
      successRate: 100,
      p95Ms: 300,
      lastSuccessAt: null,
      failingSince: null,
    };
    resetNavigation('/seller');
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    setSession({
      token: 't',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    server.use(
      http.get(`${API_URL}/shipments/status-counts`, () =>
        HttpResponse.json(counts),
      ),
      http.get(`${API_URL}/shipments/metrics`, ({ request }) => {
        metricsUrls.push(new URL(request.url));
        return HttpResponse.json(sellerMetrics());
      }),
      http.get(`${API_URL}/shipments/attention`, () =>
        HttpResponse.json({
          ...attention([late], [failed]),
          oldestPendingAt: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
        }),
      ),
      http.get(`${API_URL}/shipments/activity`, () =>
        HttpResponse.json([collected]),
      ),
      http.get(`${API_URL}/shipments`, ({ request }) => {
        const view = new URL(request.url).searchParams.get('view');
        return HttpResponse.json({
          data: view === 'active' ? [late] : [],
          meta: {
            total: view === 'late' ? 1 : 0,
            page: 1,
            limit: 100,
            totalPages: 1,
          },
        });
      }),
      http.get(`${API_URL}/webhooks/health`, () =>
        HttpResponse.json(webhookHealth),
      ),
    );
  });

  it('puts a down webhook first, as an alert and an exception', async () => {
    webhookHealth = {
      ...webhookHealth,
      state: 'down',
      failingSince: '2026-11-16T17:02:00.000Z',
    };
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Webhooks down failing since 14:02 · no success in 24 h',
    );
    const exceptions = (
      await screen.findByRole('heading', { name: 'Exceptions 3' })
    ).closest('[data-slot="card"]') as HTMLElement;
    const [first] = within(exceptions).getAllByRole('link');
    expect(first).toHaveAttribute('href', '/seller/integrations');
    expect(first).toHaveTextContent('Webhook endpoint failing since 14:02');
  });

  it('leaves the exception count to the sidebar announcer', async () => {
    const { container } = renderWithQueryClient(<SellerDashboard />);
    await screen.findByRole('heading', { name: 'Exceptions 2' });

    expect(
      container.querySelector('[aria-live="polite"]'),
    ).toBeEmptyDOMElement();
  });

  it('dates the window and the one it is compared with', async () => {
    renderWithQueryClient(<SellerDashboard />);

    expect(
      await screen.findByText(/^Aug 13 – .* · compared with May 15 – Aug 12$/),
    ).toBeVisible();
    expect(metricsUrls.at(-1)?.searchParams.get('window')).toBe('30d');
  });

  it('reads each tile with its note and delta', async () => {
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByText('91.3%')).toBeVisible();
    expect(
      screen.getByText('n=150 · ○ prev 88.1% · | 90%'),
    ).toBeInTheDocument();
    // The narrow note: the count, then the delta with its spoken direction.
    expect(
      screen.getByText(
        (_, node) => node?.textContent === 'n=150 · ▲ 3.2 pts up from 88.1%',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('1 unclaimed · oldest 2 h'),
    ).toBeInTheDocument();
    expect(screen.getByText('past due · 0 to 12 h')).toBeInTheDocument();
    expect(screen.getByText('of 180 created · per week')).toBeInTheDocument();
    expect(screen.getByText('p90 2.8 d · SLA 3 d · n=150')).toBeInTheDocument();
    expect(
      screen.getByText('3 failed · 6 returned · n=159'),
    ).toBeInTheDocument();
  });

  it('holds the comparison back while the window is immature', async () => {
    useMetrics(
      sellerMetrics({
        comparison: { ...sellerMetrics().comparison, mature: false },
      }),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(
      await screen.findAllByText('Comparison once more shipments close'),
    ).toHaveLength(2);
    expect(screen.queryByText(/compared with/)).toBeNull();
    expect(screen.queryByText(/prev 88.1%/)).toBeNull();
  });

  it('says so when the previous window has no history', async () => {
    useMetrics(
      sellerMetrics({
        comparison: {
          ...sellerMetrics().comparison,
          onTime: { n: 0, count: 0, rate: null },
          firstAttempt: { n: 0, count: 0, rate: null },
        },
      }),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(
      await screen.findByText(/^Aug 13 – .* · No earlier history to compare$/),
    ).toBeVisible();
    expect(screen.queryByText(/compared with/)).toBeNull();
  });

  it('reads low samples as a dash with their n and draws no figure', async () => {
    useMetrics(
      sellerMetrics({
        onTime: { n: 3, count: 3, rate: 100, trend: [] },
        medianDelivery: { hours: 30, p90Hours: 40, n: 3 },
        firstAttempt: { rate: 100, n: 3, failed: 0, returned: 0 },
      }),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByText('Not enough history (n=3)')).toBeVisible();
    expect(screen.getAllByText('Not enough deliveries (n=3)')).toHaveLength(2);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('keeps the now tiles when the window metrics fail', async () => {
    server.use(
      http.get(`${API_URL}/shipments/metrics`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(
      (await screen.findAllByText("Couldn't load the window's metrics."))
        .length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByRole('link', {
        name: 'Late now, 1. View late shipments',
      }),
    ).toBeVisible();
    expect(screen.getByRole('list', { name: 'Last hour 1' })).toBeVisible();
  });

  it.each([
    ['attention', "Couldn't load the late shipments."],
    ['status-counts', "Couldn't load the shipment flow."],
  ])('keeps the other sections when %s fails', async (path, message) => {
    server.use(
      http.get(`${API_URL}/shipments/${path}`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(await screen.findByText('91.3%')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Recent updates' }),
    ).toBeVisible();
  });

  it('keeps the other sections when the activity fails', async () => {
    server.use(
      http.get(`${API_URL}/shipments/activity`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByText('91.3%')).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: /^Exceptions/ }),
    ).toBeVisible();
    expect(
      await screen.findByRole('link', {
        name: 'Late now, 1. View late shipments',
      }),
    ).toBeVisible();
  });

  it('falls back to the unclaimed count when attention fails', async () => {
    server.use(
      http.get(`${API_URL}/shipments/attention`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByText('1 unclaimed')).toBeInTheDocument();
  });

  it('asks for the first shipment when there is nothing yet', async () => {
    server.use(
      http.get(`${API_URL}/shipments/status-counts`, () =>
        HttpResponse.json(
          Object.fromEntries(Object.keys(counts).map((key) => [key, 0])),
        ),
      ),
    );
    renderWithQueryClient(<SellerDashboard />);

    expect(await screen.findByText('Send your first shipment')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /^Exceptions/ })).toBeNull();
  });

  it('dims the previous numbers while another window loads', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const user = userEvent.setup();
    renderWithQueryClient(<SellerDashboard />);
    expect(await screen.findByText('91.3%')).toBeVisible();
    server.use(
      http.get(`${API_URL}/shipments/metrics`, async () => {
        await gate;
        return HttpResponse.json(sellerMetrics());
      }),
    );

    await user.click(screen.getByRole('radio', { name: '7 d' }));

    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeNull(),
    );
    release();
    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).toBeNull(),
    );
  });

  it('opens each count tile and flow legend count on exactly that list', async () => {
    resetNavigation('/seller?window=7d');
    renderWithQueryClient(<SellerDashboard />);

    const href = async (name: string) =>
      (await screen.findByRole('link', { name })).getAttribute('href');
    expect(await href('Active now, 2. View active shipments')).toBe(
      '/seller/shipments?view=active',
    );
    expect(await href('Late now, 1. View late shipments')).toBe(
      '/seller/shipments?view=late',
    );
    expect(await href('On time 7 d, 91.3%. View late deliveries')).toBe(
      '/seller/shipments?status=DELIVERED&window=7d&sla=late',
    );
    expect(await href('Delivered 7 d, 150. View delivered shipments')).toBe(
      '/seller/shipments?status=DELIVERED&window=7d',
    );
    expect(await href('First attempt 7 d, 94.3%. View exceptions')).toBe(
      '/seller/shipments?view=exceptions',
    );
    expect(await href('Due soon 0')).toBe('/seller/shipments?view=due-soon');
    expect(metricsUrls.at(-1)?.searchParams.get('window')).toBe('7d');
  });

  it('listens on the seller room for live updates', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    renderWithQueryClient(<SellerDashboard />);
    await screen.findByRole('heading', { name: /^Exceptions/ });

    act(() => socket.trigger('connect'));

    // The shipment feed and webhook health each join the seller room.
    expect(new Set(socket.emit.mock.calls.map(([event]) => event))).toEqual(
      new Set(['subscribe:seller']),
    );
  });

  it('lists recent updates and marks a live arrival as new', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    let calls = 0;
    server.use(
      http.get(`${API_URL}/shipments/activity`, () => {
        calls += 1;
        return HttpResponse.json(
          calls === 1 ? [collected] : [delivered, collected],
        );
      }),
    );
    renderWithQueryClient(<SellerDashboard />);

    const log = await screen.findByRole('list', { name: 'Last hour 1' });
    expect(within(log).getAllByRole('link')).toHaveLength(1);
    expect(within(log).queryByText('New')).not.toBeInTheDocument();

    act(() => socket.trigger('connect'));
    act(() => socket.trigger('shipment:updated', { status: 'DELIVERED' }));

    const fresh = await screen.findByRole('list', { name: 'Last hour 2' });
    expect(within(fresh).getByText('New')).toBeInTheDocument();
    const [first] = within(fresh).getAllByRole('link');
    expect(first).toHaveTextContent('TMS-DELIVERED');
    expect(first).toHaveAttribute(
      'href',
      '/seller/shipments/shipment-delivered',
    );
  });

  it('holds live arrivals while paused and counts them until back to live', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    let calls = 0;
    server.use(
      http.get(`${API_URL}/shipments/activity`, ({ request }) => {
        calls += 1;
        const url = new URL(request.url);
        expect(url.searchParams.get('limit')).toBe('200');
        expect(
          Date.now() - Date.parse(url.searchParams.get('since') ?? ''),
        ).toBeCloseTo(4 * HOUR_MS, -4);
        return HttpResponse.json(
          calls === 1 ? [collected] : [delivered, collected],
        );
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<SellerDashboard />);
    await screen.findByRole('list', { name: 'Last hour 1' });

    await user.click(screen.getByRole('button', { name: 'Pause updates' }));
    act(() => socket.trigger('connect'));
    act(() => socket.trigger('shipment:updated', { status: 'DELIVERED' }));

    expect(await screen.findByText('Paused · 1 new')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Last hour 1' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Back to live' }));
    expect(screen.getByRole('list', { name: 'Last hour 2' })).toBeVisible();
  });
});
