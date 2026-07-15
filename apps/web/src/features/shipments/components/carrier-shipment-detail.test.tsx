import { screen, waitFor } from '@testing-library/react';
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
});
