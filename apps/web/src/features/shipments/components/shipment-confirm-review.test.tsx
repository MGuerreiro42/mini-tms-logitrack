import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import type { CreateShipmentInput } from '../types';
import { ShipmentConfirmReview } from './shipment-confirm-review';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

const input: CreateShipmentInput = {
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
  modalityId: 'modality-1',
  carrierId: 'carrier-1',
};

describe('ShipmentConfirmReview', () => {
  const push = vi.fn();

  beforeEach(() => {
    push.mockReset();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<
      typeof useRouter
    >);
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
  });

  it('renders the reviewed values', () => {
    renderWithQueryClient(
      <ShipmentConfirmReview
        input={input}
        modalityName="Standard"
        carrierName="Fast Freight"
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Av. Paulista, 1000')).toBeInTheDocument();
    expect(screen.getByText('São Paulo/SP')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Fast Freight')).toBeInTheDocument();
  });

  it('confirming navigates to the created shipment', async () => {
    server.use(
      http.post(`${API_URL}/shipments`, () =>
        HttpResponse.json(
          { id: 'shipment-1', trackingCode: 'TMS-ABC123' },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <ShipmentConfirmReview
        input={input}
        modalityName="Standard"
        carrierName="Fast Freight"
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirm shipment/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/seller/shipments/shipment-1'),
    );
  });

  it('surfaces the real business-rule message verbatim on a failed re-validation', async () => {
    server.use(
      http.post(`${API_URL}/shipments`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message:
              'This carrier does not cover the address or does not offer the chosen modality',
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(
      <ShipmentConfirmReview
        input={input}
        modalityName="Standard"
        carrierName="Fast Freight"
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirm shipment/i }));

    expect(
      await screen.findByText(
        'This carrier does not cover the address or does not offer the chosen modality',
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithQueryClient(
      <ShipmentConfirmReview
        input={input}
        modalityName="Standard"
        carrierName="Fast Freight"
        onBack={onBack}
      />,
    );

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
