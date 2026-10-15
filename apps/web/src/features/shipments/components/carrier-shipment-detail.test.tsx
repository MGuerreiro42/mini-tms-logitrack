import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { toast } from 'sonner';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { CarrierShipment } from '../types';
import { CarrierShipmentDetail } from './carrier-shipment-detail';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const unclaimedShipment: CarrierShipment = {
  id: 'shipment-1',
  trackingCode: 'TMS-AAA111',
  status: 'PENDING',
  modalityId: 'modality-1',
  modalityName: 'Standard',
  sellerId: 'seller-1',
  sellerCompanyName: 'Example Store',
  sellerEmail: 'seller@example.com',
  ownerId: null,
  ownerEmail: null,
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressComplement: null,
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
  createdAt: '2026-01-01T00:00:00.000Z',
  dueAt: '2026-01-06T00:00:00.000Z',
  trackingEvents: [],
};

const claimedByOperator: CarrierShipment = {
  ...unclaimedShipment,
  status: 'ACCEPTED',
  ownerId: 'carrier-user-1',
  ownerEmail: 'operator@example.com',
};

function mockDetail(shipment: CarrierShipment) {
  server.use(
    http.get(`${API_URL}/shipments/queue/shipment-1`, () =>
      HttpResponse.json(shipment),
    ),
  );
}

describe('CarrierShipmentDetail', () => {
  beforeEach(() => {
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows a Claim button and no advance controls for an unclaimed shipment', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(unclaimedShipment);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(
      screen.getByRole('button', { name: 'Claim shipment' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Advance to/ }),
    ).not.toBeInTheDocument();
  });

  it('claiming calls the claim endpoint', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(unclaimedShipment);
    let claimed = false;
    server.use(
      http.patch(`${API_URL}/shipments/shipment-1/claim`, () => {
        claimed = true;
        return HttpResponse.json(claimedByOperator);
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);
    await screen.findByRole('heading', { name: 'TMS-AAA111' });

    await user.click(screen.getByRole('button', { name: 'Claim shipment' }));

    await waitFor(() => expect(claimed).toBe(true));
  });

  it('shows the Advance control to the owning operator', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(claimedByOperator);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(
      screen.getByRole('button', { name: 'Advance to collected' }),
    ).toBeInTheDocument();
  });

  it('hides the Advance control from a non-owning operator', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-2',
      email: 'someone-else@example.com',
    });
    mockDetail(claimedByOperator);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(
      screen.queryByRole('button', { name: /Advance to/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Waiting on the owner' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Only the owner or the carrier manager/),
    ).toBeInTheDocument();
  });

  it('drops a draft note once the status moves on', async () => {
    const socket = makeFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket as never);
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(claimedByOperator);
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);
    await user.type(
      await screen.findByLabelText('Note for the seller, optional'),
      'Draft',
    );

    mockDetail({ ...claimedByOperator, status: 'COLLECTED' });
    socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });

    await screen.findByRole('button', { name: 'Advance to in transit' });
    expect(screen.getByLabelText('Note for the seller, optional')).toHaveValue(
      '',
    );
  });

  it('shows the Advance control to the carrier manager even when they are not the owner', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    mockDetail(claimedByOperator);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(
      screen.getByRole('button', { name: 'Advance to collected' }),
    ).toBeInTheDocument();
  });

  it('renders the tracking timeline', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    mockDetail({
      ...claimedByOperator,
      trackingEvents: [
        {
          id: 'event-1',
          status: 'ACCEPTED',
          note: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
  });

  it('asks for confirmation before marking a delivery as failed', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    mockDetail({ ...claimedByOperator, status: 'OUT_FOR_DELIVERY' });
    let body: unknown;
    server.use(
      http.patch(
        `${API_URL}/shipments/shipment-1/status`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({
            ...claimedByOperator,
            status: 'FAILED_DELIVERY',
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await user.type(
      await screen.findByLabelText('Note for the seller, optional'),
      'Nobody at the door',
    );
    await user.click(
      screen.getByRole('button', { name: 'Report failed delivery' }),
    );
    expect(body).toBeUndefined();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Mark delivery as failed?');
    await user.click(
      within(dialog).getByRole('button', { name: 'Report failed delivery' }),
    );

    await waitFor(() =>
      expect(body).toEqual({
        status: 'FAILED_DELIVERY',
        note: 'Nobody at the door',
      }),
    );
  });

  it('sends the optional note with the advance', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(claimedByOperator);
    let body: unknown;
    server.use(
      http.patch(
        `${API_URL}/shipments/shipment-1/status`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({
            ...claimedByOperator,
            status: 'COLLECTED',
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await user.type(
      await screen.findByLabelText('Note for the seller, optional'),
      ' Picked up at the dock ',
    );
    await user.click(
      screen.getByRole('button', { name: 'Advance to collected' }),
    );

    await waitFor(() =>
      expect(body).toEqual({
        status: 'COLLECTED',
        note: 'Picked up at the dock',
      }),
    );
  });

  it('makes returning the next step after a failed delivery', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    mockDetail({ ...claimedByOperator, status: 'FAILED_DELIVERY' });

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    const step = await screen.findByRole('region', { name: 'Next step' });
    expect(
      within(step).getByRole('heading', { name: 'Return to the seller' }),
    ).toBeInTheDocument();
    expect(
      within(step).getByRole('button', { name: 'Return to the seller' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Report failed delivery' }),
    ).toBeNull();
  });

  it('shows the owner and the SLA in the header', async () => {
    vi.useFakeTimers({
      now: new Date('2026-01-06T02:00:00.000Z'),
      toFake: ['Date'],
    });
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(claimedByOperator);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByRole('heading', { name: 'TMS-AAA111' });
    expect(screen.getByText('Owned by you')).toBeInTheDocument();
    expect(screen.getByText('2 h late')).toBeInTheDocument();
  });

  it('offers no claim or advance for an unclaimed cancelled shipment', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    mockDetail({ ...unclaimedShipment, status: 'CANCELLED' });

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    expect(await screen.findByText('Nothing left to do')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim shipment' })).toBeNull();
    expect(screen.queryByText('Unclaimed')).toBeNull();
    expect(screen.queryByText(/Owned by/)).toBeNull();
  });

  describe('when the seller cancels while the page is open', () => {
    async function cancelLive(viewerEmail: string) {
      const info = vi.spyOn(toast, 'info');
      const socket = makeFakeSocket();
      vi.mocked(getSocket).mockReturnValue(socket as never);
      setSession({
        token: 't',
        role: 'CARRIER_OPERATOR',
        userId: 'user-1',
        email: viewerEmail,
      });
      mockDetail(claimedByOperator);
      renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);
      await screen.findByRole('heading', { name: 'TMS-AAA111' });

      mockDetail({ ...claimedByOperator, status: 'CANCELLED' });
      socket.trigger('shipment:updated', { shipmentId: 'shipment-1' });
      await screen.findByText('Nothing left to do');
      return info;
    }

    it('tells the operator who owns the shipment', async () => {
      const info = await cancelLive('operator@example.com');

      expect(info).toHaveBeenCalledExactlyOnceWith(
        'The seller cancelled this shipment.',
      );
    });

    it('stays quiet for an operator who does not own it', async () => {
      const info = await cancelLive('other-operator@example.com');

      expect(info).not.toHaveBeenCalled();
    });
  });

  it('does not announce a shipment that was already cancelled when opened', async () => {
    const info = vi.spyOn(toast, 'info');
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail({ ...claimedByOperator, status: 'CANCELLED' });

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);
    await screen.findByText('Nothing left to do');

    expect(info).not.toHaveBeenCalled();
  });

  it('shows a not-found state instead of loading forever on a 404', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-3',
      email: 'manager@example.com',
    });
    server.use(
      http.get(`${API_URL}/shipments/queue/shipment-1`, () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Shipment not found' },
          { status: 404 },
        ),
      ),
    );

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    expect(await screen.findByText('Shipment not found.')).toBeInTheDocument();
  });
});
