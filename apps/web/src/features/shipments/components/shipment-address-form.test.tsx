import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setSession } from '@/lib/session';
import { server } from '@/test/msw/server';
import { renderWithQueryClient } from '@/test/render';
import { ShipmentAddressForm } from './shipment-address-form';

const API_URL = 'http://localhost:3333';

function mockModalities(
  modalities: { id: string; code: string; name: string; enabled: boolean }[],
) {
  server.use(
    http.get(`${API_URL}/sellers/me/modalities`, () =>
      HttpResponse.json(modalities),
    ),
  );
}

async function fillAddressFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Zip code'), '01310-100');
  await user.type(screen.getByLabelText('State (UF)'), 'SP');
  await user.type(screen.getByLabelText('City'), 'São Paulo');
  await user.type(screen.getByLabelText('Street'), 'Av. Paulista');
  await user.type(screen.getByLabelText('Number'), '1000');
  await user.type(screen.getByLabelText('Neighborhood'), 'Bela Vista');
}

describe('ShipmentAddressForm', () => {
  beforeEach(() => {
    setSession({
      token: 'signed.jwt.token',
      role: 'SELLER',
      userId: 'user-1',
      email: 'seller@example.com',
    });
  });

  it('only offers the seller’s own enabled modalities', async () => {
    mockModalities([
      { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
      { id: 'modality-2', code: 'EXPRESS', name: 'Express', enabled: false },
    ]);
    renderWithQueryClient(<ShipmentAddressForm onNext={vi.fn()} />);

    expect(
      await screen.findByRole('button', { name: 'Standard' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Express' })).toBeNull();
  });

  it('shows a hint when no modality is enabled yet', async () => {
    mockModalities([]);
    renderWithQueryClient(<ShipmentAddressForm onNext={vi.fn()} />);

    expect(
      await screen.findByText(/haven't enabled any modality/i),
    ).toBeInTheDocument();
  });

  it('requires every address field and a chosen modality', async () => {
    mockModalities([]);
    const user = userEvent.setup();
    renderWithQueryClient(<ShipmentAddressForm onNext={vi.fn()} />);
    await screen.findByText(/haven't enabled any modality/i);

    await user.click(
      screen.getByRole('button', { name: /see eligible carriers/i }),
    );

    expect(await screen.findAllByText('Required')).toHaveLength(6);
    expect(screen.getByText('Pick a modality')).toBeInTheDocument();
  });

  it('calls onNext with the form values and the chosen modality name', async () => {
    mockModalities([
      { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
    ]);
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithQueryClient(<ShipmentAddressForm onNext={onNext} />);

    await fillAddressFields(user);
    await user.click(await screen.findByRole('button', { name: 'Standard' }));
    await user.click(
      screen.getByRole('button', { name: /see eligible carriers/i }),
    );

    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({
          addressZipCode: '01310-100',
          addressState: 'SP',
          addressCity: 'São Paulo',
          addressStreet: 'Av. Paulista',
          addressNumber: '1000',
          addressNeighborhood: 'Bela Vista',
          modalityId: 'modality-1',
        }),
        'Standard',
      ),
    );
  });
});
