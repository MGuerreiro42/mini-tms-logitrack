import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { CarrierQueueTable } from './carrier-queue-table';

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('@/services/websocket-client', () => ({ getSocket: vi.fn() }));

const API_URL = 'http://localhost:3333';

const unownedShipment = {
  id: 'shipment-1',
  trackingCode: 'TMS-AAA111',
  status: 'PENDING',
  sellerCompanyName: 'Example Store',
  addressCity: 'São Paulo',
  addressState: 'SP',
  ownerId: null,
  ownerEmail: null,
};

const ownedShipment = {
  id: 'shipment-2',
  trackingCode: 'TMS-BBB222',
  status: 'ACCEPTED',
  sellerCompanyName: 'Another Store',
  addressCity: 'Campinas',
  addressState: 'SP',
  ownerId: 'carrier-user-1',
  ownerEmail: 'operator@example.com',
};

describe('CarrierQueueTable', () => {
  let requestedUrls: string[] = [];
  let push: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestedUrls = [];
    push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    setSession({
      token: 'signed.jwt.token',
      role: 'CARRIER_OPERATOR',
      userId: 'user-1',
      email: 'operator@example.com',
    });
    server.use(
      http.get(`${API_URL}/shipments/queue`, ({ request }) => {
        requestedUrls.push(request.url);
        return HttpResponse.json({
          data: [unownedShipment, ownedShipment],
          meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
        });
      }),
    );
  });

  it('renders every row with seller, destination, and owner', async () => {
    renderWithQueryClient(<CarrierQueueTable />);

    await screen.findByText('Example Store');
    expect(screen.getByText('Another Store')).toBeInTheDocument();
    expect(screen.getByText('São Paulo/SP')).toBeInTheDocument();
    expect(screen.getByText('operator@example.com')).toBeInTheDocument();
  });

  it('only shows a Claim button on the unowned row', async () => {
    renderWithQueryClient(<CarrierQueueTable />);
    await screen.findByText('Example Store');

    expect(screen.getAllByRole('button', { name: 'Claim' })).toHaveLength(1);
  });

  it('claiming a shipment calls the claim endpoint and does not navigate the row', async () => {
    let claimedId: string | undefined;
    server.use(
      http.patch(`${API_URL}/shipments/:id/claim`, ({ params }) => {
        claimedId = params.id as string;
        return HttpResponse.json({ ...unownedShipment, status: 'ACCEPTED' });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierQueueTable />);
    await screen.findByText('Example Store');

    await user.click(screen.getByRole('button', { name: 'Claim' }));

    await waitFor(() => expect(claimedId).toBe('shipment-1'));
    expect(push).not.toHaveBeenCalled();
  });

  it('switching the status tab refetches with the new filter and resets to page 1', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CarrierQueueTable />);
    await screen.findByText('Example Store');

    await user.click(screen.getByRole('tab', { name: 'Accepted' }));

    await waitFor(() =>
      expect(requestedUrls.at(-1)).toContain('status=ACCEPTED'),
    );
  });
});
