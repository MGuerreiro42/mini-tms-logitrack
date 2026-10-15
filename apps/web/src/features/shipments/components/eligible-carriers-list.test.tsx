import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { EligibleCarriersList } from './eligible-carriers-list';

const API_URL = 'http://localhost:3333';

const address = {
  addressStreet: 'Av. Paulista',
  addressNumber: '1000',
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
};
const modality = { id: 'modality-1', name: 'Standard', slaHours: 48 };

describe('EligibleCarriersList', () => {
  beforeEach(() => {
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
  });

  it('shows the empty state — the most important exception in this flow — when no carrier matches', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([]),
      ),
    );
    renderWithQueryClient(
      <EligibleCarriersList
        address={{ ...address, addressCity: 'Araraquara' }}
        modality={modality}
        onBack={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('No compatible carrier'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Araraquara\/SP/)).toBeInTheDocument();
  });

  it('selects a carrier and only continues on Continue', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([
          { id: 'carrier-1', companyName: 'Fast Freight' },
          { id: 'carrier-2', companyName: 'Speedy Logistics' },
        ]),
      ),
    );
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithQueryClient(
      <EligibleCarriersList
        address={address}
        modality={modality}
        onBack={vi.fn()}
        onNext={onNext}
      />,
    );

    expect(
      await screen.findByRole('group', {
        name: 'Choose a carrier · 2 available',
      }),
    ).toBeInTheDocument();
    const continueButton = screen.getByRole('button', {
      name: 'Continue to review',
    });
    expect(continueButton).toBeDisabled();

    const option = screen.getByRole('radio', { name: 'Fast Freight' });
    expect(option).toHaveAccessibleDescription(
      'Covers São Paulo, SP Modality Standard · delivered within 48 h',
    );
    await user.click(option);
    expect(option).toBeChecked();
    expect(screen.getAllByText('Fast Freight')).toHaveLength(2);
    expect(onNext).not.toHaveBeenCalled();

    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith('carrier-1', 'Fast Freight');
  });

  it('calls onBack when the back button is clicked', async () => {
    server.use(
      http.get(`${API_URL}/shipments/eligible-carriers`, () =>
        HttpResponse.json([]),
      ),
    );
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithQueryClient(
      <EligibleCarriersList
        address={address}
        modality={modality}
        onBack={onBack}
        onNext={vi.fn()}
      />,
    );

    await screen.findByText('No compatible carrier');
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
