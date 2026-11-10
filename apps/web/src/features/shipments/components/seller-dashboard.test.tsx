import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import type { Shipment, ShipmentActivity, ShipmentStatus } from '../types';
import { SellerDashboard } from './seller-dashboard';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';
const HOUR_MS = 60 * 60 * 1000;

function shipment(
  id: string,
  status: ShipmentStatus,
  dueInHours: number,
): Shipment {
  return {
    id,
    trackingCode: `TMS-${id.toUpperCase()}`,
    status,
    dueAt: new Date(Date.now() + dueInHours * HOUR_MS).toISOString(),
    deliveredAt: null,
    carrierId: 'carrier-1',
    carrierName: 'Fast Carrier',
    modalityId: 'modality-1',
    modalityName: 'Standard',
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressComplement: null,
    addressNeighborhood: 'Bela Vista',
    addressCity: 'Bauru',
    addressState: 'SP',
    addressZipCode: '01310-100',
    createdAt: '2026-10-10T12:00:00.000Z',
  };
}

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
    createdAt: new Date().toISOString(),
  };
}

const collected = activity('collected', 'COLLECTED');
const delivered = activity('delivered', 'DELIVERED');

describe('SellerDashboard', () => {
  let metricsUrls: URL[] = [];

  beforeEach(() => {
    metricsUrls = [];
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
        return HttpResponse.json({
          delivered: 9,
          onTime: {
            n: 10,
            count: 8,
            rate: 80,
            trend: [100, null, 50, 80, 75, 90, 80, 70, 85, 80, 75, 80],
          },
          byModality: [
            {
              modalityCode: 'STANDARD',
              modalityName: 'Standard',
              n: 10,
              count: 8,
              rate: 80,
            },
          ],
        });
      }),
      http.get(`${API_URL}/shipments/attention`, () =>
        HttpResponse.json({
          shipments: [failed, late],
          counts: { failed: 1, late: 6 },
        }),
      ),
      http.get(`${API_URL}/shipments/activity`, () =>
        HttpResponse.json([collected]),
      ),
    );
  });

  it('shows the attention list and KPIs', async () => {
    renderWithQueryClient(<SellerDashboard />);

    const attention = (
      await screen.findByRole('heading', { name: 'Needs your attention' })
    ).closest('[data-slot="card"]') as HTMLElement;
    const items = within(attention).getAllByRole('link');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Delivery attempt failed');
    expect(items[1]).toHaveTextContent('Past its SLA');
    expect(items[1]).toHaveTextContent(/Late \d h/);
    expect(items[1]).toHaveAttribute('href', '/seller/shipments/late');

    // The tone colours the value, never the note.
    expect(screen.getAllByText('80.0%')[0].parentElement).toHaveClass(
      'text-notice-foreground',
    );
    expect(screen.getByText('n=10 · target 90%')).toBeInTheDocument();
    expect(screen.getByText('1 waiting for a carrier')).toBeInTheDocument();
    expect(screen.getByText(/^oldest 5 h/)).toBeInTheDocument();
    expect(metricsUrls.at(-1)?.searchParams.get('window')).toBe('30d');
    expect(screen.getByText('5 more shipments not shown')).toBeInTheDocument();
  });

  it('opens each count tile and pipeline segment on exactly that list', async () => {
    resetNavigation('/seller?window=7d');
    renderWithQueryClient(<SellerDashboard />);

    const href = async (name: string) =>
      (await screen.findByRole('link', { name })).getAttribute('href');
    expect(await href('Active now, 2. View active shipments')).toBe(
      '/seller/shipments?view=active',
    );
    expect(await href('Late now, 6. View late shipments')).toBe(
      '/seller/shipments?view=late',
    );
    expect(await href('Delivered 7 d, 9. View delivered shipments')).toBe(
      '/seller/shipments?status=DELIVERED&window=7d',
    );
    expect(await href('1 In transit')).toBe(
      '/seller/shipments?status=IN_TRANSIT',
    );
    expect(metricsUrls.at(-1)?.searchParams.get('window')).toBe('7d');
  });

  it('listens on the seller room for live updates', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    renderWithQueryClient(<SellerDashboard />);
    await screen.findByRole('heading', { name: 'Needs your attention' });

    act(() => socket.trigger('connect'));

    expect(socket.emit.mock.calls.map(([event]) => event)).toEqual([
      'subscribe:seller',
    ]);
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

    const log = await screen.findByRole('log', { name: 'Recent updates' });
    expect(within(log).getAllByRole('link')).toHaveLength(1);
    expect(within(log).queryByText('New')).not.toBeInTheDocument();

    act(() => socket.trigger('connect'));
    act(() => socket.trigger('shipment:updated', { status: 'DELIVERED' }));

    expect(await within(log).findByText('New')).toBeInTheDocument();
    const [first] = within(log).getAllByRole('link');
    expect(first).toHaveTextContent('TMS-DELIVERED');
    expect(first).toHaveAttribute(
      'href',
      '/seller/shipments/shipment-delivered',
    );
  });

  it('holds live arrivals while paused and shows them on request', async () => {
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
    const user = userEvent.setup();
    renderWithQueryClient(<SellerDashboard />);
    const log = await screen.findByRole('log', { name: 'Recent updates' });

    await user.click(screen.getByRole('button', { name: 'Pause updates' }));
    act(() => socket.trigger('connect'));
    act(() => socket.trigger('shipment:updated', { status: 'DELIVERED' }));

    const show = await screen.findByRole('button', {
      name: 'Show 1 new update',
    });
    expect(within(log).getAllByRole('link')).toHaveLength(1);

    await user.click(show);
    expect(within(log).getAllByRole('link')).toHaveLength(2);
  });
});
