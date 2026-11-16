import { render, screen } from '@testing-library/react';
import { setSession } from '@/lib/session';
import { OwnerChip } from './owner-chip';

const owned = {
  ownerId: 'cu-1',
  ownerEmail: 'ana@example.com',
  ownerName: 'Ana Maria Souza',
  status: 'ACCEPTED' as const,
};

describe('OwnerChip', () => {
  beforeEach(() =>
    setSession({
      token: 't',
      role: 'CARRIER_MANAGER',
      userId: 'user-1',
      email: 'manager@example.com',
    }),
  );

  it.each([
    [owned, 'Ana S.', 'AM'],
    [{ ...owned, ownerName: 'Bruno' }, 'Bruno', 'B'],
    [{ ...owned, ownerName: null }, 'ana@example.com', 'A'],
    [{ ...owned, ownerEmail: 'manager@example.com' }, 'You', 'AM'],
  ])('shows an owner by name, e-mail or "You"', (shipment, label, initials) => {
    const { container } = render(<OwnerChip shipment={shipment} />);

    expect(screen.getByText(label)).toBeVisible();
    expect(container.querySelector('[aria-hidden]')).toHaveTextContent(
      initials,
    );
  });

  it.each([
    ['PENDING', 'Unclaimed'],
    ['CANCELLED', '—'],
  ] as const)('reads a %s shipment without owner as %s', (status, label) => {
    render(
      <OwnerChip
        shipment={{ ownerId: null, ownerEmail: null, ownerName: null, status }}
      />,
    );

    expect(screen.getByText(label)).toBeVisible();
  });
});
