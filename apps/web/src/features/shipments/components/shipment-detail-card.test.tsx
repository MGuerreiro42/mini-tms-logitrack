import { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { toast } from 'sonner';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { Shipment } from '../types';
import { ShipmentDetailCard } from './shipment-detail-card';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API_URL = 'http://localhost:3333';

const pendingShipment: Shipment = {
  id: 'shipment-1',
  trackingCode: 'TMS-AAA111',
  status: 'PENDING',
  carrierId: 'carrier-1',
  carrierName: 'Fast Carrier',
  modalityId: 'modality-1',
  modalityName: 'Standard',
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressComplement: null,
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
  createdAt: '2026-01-01T00:00:00.000Z',
  trackingEvents: [],
};

describe('ShipmentDetailCard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    setSession({
      token: 't',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () =>
        HttpResponse.json(pendingShipment),
      ),
    );
  });

  it('stops polling a shipment that does not exist', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let requests = 0;
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () => {
        requests++;
        return HttpResponse.json(
          { statusCode: 404, message: 'Not found' },
          { status: 404 },
        );
      }),
    );
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);
    await screen.findByText('Shipment not found.');

    await act(() => vi.advanceTimersByTimeAsync(16_000));

    expect(requests).toBe(1);
  });

  it('polls every few seconds until the subscription is live, then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let requests = 0;
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () => {
        requests++;
        return HttpResponse.json(pendingShipment);
      }),
    );
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);
    await screen.findByText('Fast Carrier');

    await act(() => vi.advanceTimersByTimeAsync(5_100));
    await waitFor(() => expect(requests).toBe(2));

    act(() => socket.trigger('connect'));
    await act(async () => socket.ackAll({ ok: true }));
    await waitFor(() => expect(requests).toBe(3));
    expect(screen.getByRole('status')).toHaveTextContent('Live');

    await act(() => vi.advanceTimersByTimeAsync(16_000));

    expect(requests).toBe(3);
  });

  it('shows the real public tracking URL and copies it', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);

    const expectedUrl = `${window.location.origin}/track/TMS-AAA111`;
    expect(await screen.findByText(expectedUrl)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Copy tracking link' }),
    );

    expect(await navigator.clipboard.readText()).toBe(expectedUrl);
    expect(toast.success).toHaveBeenCalledWith('Link copied');
  });

  it('hides the cancel action once the shipment was collected', async () => {
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () =>
        HttpResponse.json({ ...pendingShipment, status: 'COLLECTED' }),
      ),
    );
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);

    await screen.findByText('Fast Carrier');
    expect(
      screen.queryByRole('button', { name: 'Cancel shipment' }),
    ).toBeNull();
  });

  it('cancels with the optional note after confirming', async () => {
    let body: unknown;
    server.use(
      http.patch(
        `${API_URL}/shipments/shipment-1/cancel`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ ...pendingShipment, status: 'CANCELLED' });
        },
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);

    await user.click(
      await screen.findByRole('button', { name: 'Cancel shipment' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('Reason (optional)'),
      'Customer gave up',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancel shipment' }),
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Shipment cancelled'),
    );
    expect(body).toEqual({ note: 'Customer gave up' });
  });

  function collectElsewhere() {
    server.use(
      http.get(`${API_URL}/shipments/shipment-1`, () =>
        HttpResponse.json({ ...pendingShipment, status: 'COLLECTED' }),
      ),
    );
  }

  async function openCancelDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole('button', { name: 'Cancel shipment' }),
    );
    return within(screen.getByRole('dialog'));
  }

  it('keeps the dialog open with the API message on a 409, then lets it be dismissed', async () => {
    server.use(
      http.patch(`${API_URL}/shipments/shipment-1/cancel`, () => {
        collectElsewhere();
        return HttpResponse.json(
          { statusCode: 409, message: 'Shipment status changed concurrently' },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />);

    const dialog = await openCancelDialog(user);
    await user.click(dialog.getByRole('button', { name: 'Cancel shipment' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Shipment status changed concurrently',
    );
    expect(toast.error).toHaveBeenCalledWith(
      'This shipment can no longer be cancelled.',
    );
    await waitFor(() =>
      expect(
        dialog.queryByRole('button', { name: 'Cancel shipment' }),
      ).toBeNull(),
    );

    await user.click(dialog.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Cancel shipment' }),
    ).toBeNull();
  });

  it('tells the seller when a live update withdraws the cancel action while the dialog is open', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentDetailCard id="shipment-1" />, queryClient);

    const dialog = await openCancelDialog(user);
    collectElsewhere();
    await act(() => queryClient.invalidateQueries());

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      "It's collected now. Cancelling is only possible before pickup.",
    );
    expect(
      dialog.queryByRole('button', { name: 'Cancel shipment' }),
    ).toBeNull();
  });
});
