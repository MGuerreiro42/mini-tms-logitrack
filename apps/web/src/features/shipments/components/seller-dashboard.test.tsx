import { act, screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { Shipment, ShipmentStatus } from '../types';
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
const onTrack = shipment('ok', 'PENDING', 40);

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

function page(data: Shipment[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 100, totalPages: 1 },
  };
}

describe('SellerDashboard', () => {
  beforeEach(() => {
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
      http.get(`${API_URL}/shipments/sla-summary`, () =>
        HttpResponse.json([
          {
            modalityCode: 'STANDARD',
            modalityName: 'Standard',
            deliveredCount: 10,
            onTimeCount: 8,
            onTimeRate: 80,
          },
        ]),
      ),
      http.get(`${API_URL}/shipments/attention`, () =>
        HttpResponse.json({
          shipments: [failed, late],
          counts: { failed: 1, late: 6 },
        }),
      ),
      http.get(`${API_URL}/shipments`, () =>
        HttpResponse.json(page([failed, late, onTrack])),
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
    expect(items[1]).toHaveTextContent(/\d h late/);
    expect(items[1]).toHaveAttribute('href', '/seller/shipments/late');

    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('2 deliveries past SLA')).toHaveClass(
      'text-destructive',
    );
    expect(screen.getByText('1 waiting for a carrier')).toBeInTheDocument();
    expect(screen.getByText('1 failed, 6 late')).toBeInTheDocument();
    expect(screen.getByText('5 more shipments not shown')).toBeInTheDocument();
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
});
