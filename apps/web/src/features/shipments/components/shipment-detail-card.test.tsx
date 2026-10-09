import { screen } from '@testing-library/react';
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

vi.mock('@/services/websocket-client', () => ({ getSocket: vi.fn() }));
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
  beforeEach(() => {
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
});
