import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { CarrierShipment } from '../types';
import { CarrierShipmentDetail } from './carrier-shipment-detail';

vi.mock('@/services/websocket-client', () => ({ getSocket: vi.fn() }));

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

  it('shows a Claim button and no advance controls for an unclaimed shipment', async () => {
    setSession({
      token: 't',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    mockDetail(unclaimedShipment);

    renderWithQueryClient(<CarrierShipmentDetail id="shipment-1" />);

    await screen.findByText('TMS-AAA111');
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
    await screen.findByText('TMS-AAA111');

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

    await screen.findByText('TMS-AAA111');
    expect(
      screen.getByRole('button', { name: 'Advance to Collected' }),
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

    await screen.findByText('TMS-AAA111');
    expect(
      screen.queryByRole('button', { name: /Advance to/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Only the owner or the carrier manager/),
    ).toBeInTheDocument();
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

    await screen.findByText('TMS-AAA111');
    expect(
      screen.getByRole('button', { name: 'Advance to Collected' }),
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

    await screen.findByText('TMS-AAA111');
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

    await user.click(
      await screen.findByRole('button', { name: 'Failed delivery' }),
    );
    expect(body).toBeUndefined();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Mark delivery as failed?');
    await user.click(
      within(dialog).getByRole('button', { name: 'Failed delivery' }),
    );

    await waitFor(() => expect(body).toEqual({ status: 'FAILED_DELIVERY' }));
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

    expect(
      await screen.findByText('No further action available.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim shipment' })).toBeNull();
    expect(screen.queryByText('Unclaimed')).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
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
