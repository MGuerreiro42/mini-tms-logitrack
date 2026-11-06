import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

// jsdom lacks the pointer-capture and scrolling APIs Radix Select calls when it opens.
function polyfillSelect() {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

export async function pickState(user: User, uf: string) {
  polyfillSelect();
  await user.click(screen.getByLabelText('State (UF)'));
  await user.click(await screen.findByRole('option', { name: uf }));
}

export async function fillAddressFields(user: User) {
  await user.type(screen.getByLabelText('Zip code'), '01310100');
  await pickState(user, 'SP');
  await user.type(screen.getByLabelText('City'), 'São Paulo');
  await user.type(screen.getByLabelText('Street'), 'Av. Paulista');
  await user.type(screen.getByLabelText('Number'), '1000');
  await user.type(screen.getByLabelText('Neighborhood'), 'Bela Vista');
}
