import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

export async function fillAddressFields(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(screen.getByLabelText('Zip code'), '01310-100');
  await user.type(screen.getByLabelText('State (UF)'), 'SP');
  await user.type(screen.getByLabelText('City'), 'São Paulo');
  await user.type(screen.getByLabelText('Street'), 'Av. Paulista');
  await user.type(screen.getByLabelText('Number'), '1000');
  await user.type(screen.getByLabelText('Neighborhood'), 'Bela Vista');
}
