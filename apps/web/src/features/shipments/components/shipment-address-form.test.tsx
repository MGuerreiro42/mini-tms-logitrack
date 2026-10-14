import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fillAddressFields } from '@/test/fill-address';
import { ShipmentAddressForm } from './shipment-address-form';

const standard = [{ id: 'modality-1', name: 'Standard' }];

describe('ShipmentAddressForm', () => {
  it('offers the given modalities', () => {
    render(<ShipmentAddressForm modalities={standard} onNext={vi.fn()} />);

    expect(screen.getByRole('radio', { name: 'Standard' })).toBeInTheDocument();
  });

  it('exposes the chosen modality as a checked radio', async () => {
    const user = userEvent.setup();
    render(
      <ShipmentAddressForm
        modalities={[...standard, { id: 'modality-2', name: 'Express' }]}
        onNext={vi.fn()}
      />,
    );
    const express = screen.getByRole('radio', { name: 'Express' });
    expect(express).not.toBeChecked();

    await user.click(express);

    expect(express).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Standard' })).not.toBeChecked();
  });

  it('shows a hint when no modality is enabled yet', async () => {
    render(<ShipmentAddressForm modalities={[]} onNext={vi.fn()} />);

    expect(
      await screen.findByText(/haven't enabled any modality/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Enable one in Modalities' }),
    ).toHaveAttribute('href', '/seller/modalities');
  });

  it('requires every address field and a chosen modality', async () => {
    const user = userEvent.setup();
    render(<ShipmentAddressForm modalities={[]} onNext={vi.fn()} />);
    await screen.findByText(/haven't enabled any modality/i);

    await user.click(
      screen.getByRole('button', { name: /see eligible carriers/i }),
    );

    expect(await screen.findAllByText('Required')).toHaveLength(6);
    expect(screen.getByText('Pick a modality')).toBeInTheDocument();
  });

  it('calls onNext with the form values and the chosen modality', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<ShipmentAddressForm modalities={standard} onNext={onNext} />);

    await fillAddressFields(user);
    await user.click(await screen.findByRole('radio', { name: 'Standard' }));
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
        standard[0],
      ),
    );
  });
});
