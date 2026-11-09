import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { getSocket } from '@/services/websocket-client';
import { makeFakeSocket } from '@/test/fake-socket';
import { server } from '@/test/msw/server';
import { resetNavigation } from '@/test/navigation';
import { renderWithQueryClient } from '@/test/render';
import { AdminShipmentDetail } from './admin-shipment-detail';

vi.mock('@/services/websocket-client', async (importOriginal) => ({
  ...(await importOriginal()),
  getSocket: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const response = {
  id: 'shipment-1',
  trackingCode: 'TMS-AAA111',
  status: 'COLLECTED',
  modalityId: 'modality-1',
  modalityName: 'Express',
  sellerId: 'seller-1',
  sellerCompanyName: 'Loja Demo',
  sellerEmail: 'seller@example.com',
  ownerId: 'carrier-user-1',
  ownerEmail: 'operator@example.com',
  carrierId: 'carrier-1',
  carrierCompanyName: 'Transportadora Demo',
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressComplement: null,
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310100',
  createdAt: '2026-01-01T00:00:00.000Z',
  dueAt: '2026-01-02T00:00:00.000Z',
  deliveredAt: null,
  trackingEvents: [
    {
      id: 'event-1',
      status: 'COLLECTED',
      note: null,
      actorName: 'Ana Souza',
      createdAt: '2026-01-01T06:00:00.000Z',
    },
  ],
};

describe('AdminShipmentDetail', () => {
  beforeEach(() => {
    vi.mocked(getSocket).mockReturnValue(makeFakeSocket() as never);
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
  });

  it('shows the parties and who acted, with the way back to the same monitoring page', async () => {
    resetNavigation('/admin/shipments/shipment-1?status=COLLECTED&page=2');
    server.use(
      http.get(`${API_URL}/admin/shipments/shipment-1`, () =>
        HttpResponse.json(response),
      ),
    );
    renderWithQueryClient(<AdminShipmentDetail id="shipment-1" />);

    const parties = (await screen.findByRole('heading', { name: 'Parties' }))
      .parentElement?.parentElement as HTMLElement;
    expect(parties).toHaveTextContent('Loja Demo');
    expect(parties).toHaveTextContent('Transportadora Demo');
    expect(parties).toHaveTextContent('operator@example.com');
    expect(parties).toHaveTextContent('01310-100');
    expect(screen.getByText('by Ana Souza')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole(
        'link',
        { name: 'Monitoring' },
      ),
    ).toHaveAttribute('href', '/admin/monitoring?status=COLLECTED&page=2');
  });

  it('says so when the shipment does not exist', async () => {
    server.use(
      http.get(`${API_URL}/admin/shipments/missing`, () =>
        HttpResponse.json({ statusCode: 404 }, { status: 404 }),
      ),
    );
    renderWithQueryClient(<AdminShipmentDetail id="missing" />);

    expect(await screen.findByText('Shipment not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monitoring' })).toHaveAttribute(
      'href',
      '/admin/monitoring',
    );
  });
});
