import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { fillAddressFields } from '@/test/fill-address';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { CreateShipmentWizard } from './create-shipment-wizard';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const API_URL = 'http://localhost:3333';

describe('CreateShipmentWizard', () => {
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
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([{ id: 'carrier-1', companyName: 'Fast Freight' }]),
      ),
      http.post(`${API_URL}/shipments`, () =>
        HttpResponse.json({ id: 'shipment-1' }, { status: 201 }),
      ),
    );
  });

  it('walks the full address → carrier → confirm flow and creates the shipment', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreateShipmentWizard
        modalities={[{ id: 'modality-1', name: 'Standard' }]}
      />,
    );

    await fillAddressFields(user);
    await user.click(await screen.findByRole('button', { name: 'Standard' }));
    await user.click(
      screen.getByRole('button', { name: /see eligible carriers/i }),
    );

    await user.click(
      await screen.findByRole('button', { name: /Fast Freight/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Review and confirm')).toBeInTheDocument();
    expect(screen.getByText('Av. Paulista, 1000')).toBeInTheDocument();
    expect(screen.getByText('Fast Freight')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm shipment/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/seller/shipments/shipment-1'),
    );
  });

  it('back from step 2 returns to step 1 with the address preserved', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <CreateShipmentWizard
        modalities={[{ id: 'modality-1', name: 'Standard' }]}
      />,
    );

    await fillAddressFields(user);
    await user.click(await screen.findByRole('button', { name: 'Standard' }));
    await user.click(
      screen.getByRole('button', { name: /see eligible carriers/i }),
    );

    await screen.findByText('Fast Freight');
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(await screen.findByLabelText('Zip code')).toHaveValue('01310-100');
    expect(screen.getByLabelText('Street')).toHaveValue('Av. Paulista');
  });
});
