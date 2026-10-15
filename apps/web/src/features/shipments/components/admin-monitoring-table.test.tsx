import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { setViewportWidth } from '@/test/viewport';
import { AdminMonitoringTable } from './admin-monitoring-table';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

describe('AdminMonitoringTable', () => {
  let requestedUrls: string[];

  beforeEach(() => {
    requestedUrls = [];
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
    server.use(
      http.get(`${API_URL}/admin/shipments`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json({
          data: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        });
      }),
      http.get(`${API_URL}/admin/shipments/status-counts`, ({ request }) =>
        HttpResponse.json({
          PENDING: request.url.includes('carrierId=carrier-1') ? 2 : 5,
          ACCEPTED: 0,
          COLLECTED: 0,
          IN_TRANSIT: 0,
          OUT_FOR_DELIVERY: 0,
          DELIVERED: 0,
          FAILED_DELIVERY: 0,
          RETURNED: 0,
          CANCELLED: 1,
        }),
      ),
    );
  });

  it('renders the carrier and seller filters from props without fetching them', async () => {
    renderWithQueryClient(
      <AdminMonitoringTable
        carrierOptions={[{ value: 'carrier-1', label: 'Fast Carrier' }]}
        sellerOptions={[{ value: 'seller-1', label: 'Example Store' }]}
      />,
    );

    expect(
      await screen.findByText('No shipments on the platform yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Carrier: Any/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Seller: Any/ }),
    ).toBeInTheDocument();
    expect(requestedUrls).toEqual([
      `${API_URL}/admin/shipments?page=1&limit=20`,
    ]);
  });

  it('filters by status from the toolbar menu', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <AdminMonitoringTable carrierOptions={[]} sellerOptions={[]} />,
    );
    await screen.findByText('No shipments on the platform yet.');

    await user.click(screen.getByRole('button', { name: /Status: All/ }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Cancelled/ }));

    expect(requestedUrls.at(-1)).toBe(
      `${API_URL}/admin/shipments?status=CANCELLED&page=1&limit=20`,
    );
  });

  it('counts live updates from the last minute next to the indicator', async () => {
    const socket = makeFakeSocket();
    socket.connected = true;
    vi.mocked(getSocket).mockReturnValue(socket as never);
    renderWithQueryClient(
      <AdminMonitoringTable carrierOptions={[]} sellerOptions={[]} />,
    );

    await act(async () => socket.ackAll({ ok: true }));
    expect(await screen.findByText('Live')).toBeInTheDocument();

    act(() => {
      socket.trigger('shipment:updated', { shipmentId: 's-1' });
      socket.trigger('shipment:updated', { shipmentId: 's-2' });
    });

    expect(
      screen.getByText('· 2 updates in the last minute'),
    ).toBeInTheDocument();
  });

  it('shows seller and carrier on mobile cards', async () => {
    server.use(
      http.get(`${API_URL}/admin/shipments`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'shipment-1',
              trackingCode: 'TMS-AAA111',
              status: 'PENDING',
              sellerCompanyName: 'Example Store',
              carrierCompanyName: 'Fast Carrier',
              addressCity: 'Campinas',
              addressState: 'SP',
              createdAt: '2026-10-01T12:00:00.000Z',
              dueAt: null,
            },
          ],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
    );
    setViewportWidth(390);
    renderWithQueryClient(
      <AdminMonitoringTable carrierOptions={[]} sellerOptions={[]} />,
    );

    const card = await screen.findByRole('listitem');
    expect(card).toHaveTextContent('TMS-AAA111');
    expect(card).toHaveTextContent('Example Store');
    expect(card).toHaveTextContent('Fast Carrier');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows status counts for the chosen carrier', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <AdminMonitoringTable
        carrierOptions={[{ value: 'carrier-1', label: 'Fast Carrier' }]}
        sellerOptions={[]}
      />,
    );
    expect(
      await screen.findByRole('button', { name: /Status: All 6/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Carrier: Any/ }));
    await user.click(
      screen.getByRole('menuitemradio', { name: 'Fast Carrier' }),
    );

    expect(
      await screen.findByRole('button', { name: /Status: All 3/ }),
    ).toBeInTheDocument();
  });
});
