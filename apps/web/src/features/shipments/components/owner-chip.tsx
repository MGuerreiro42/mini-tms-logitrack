'use client';

import { InitialsAvatar } from '@/components/common/initials-avatar';
import { useSession } from '@/hooks/use-session';
import { type CarrierShipment, isClaimable } from '../types';

// "Ana Souza" reads "Ana S."; a single-word name stays as it is.
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export function OwnerChip({
  shipment,
}: {
  shipment: Pick<
    CarrierShipment,
    'ownerId' | 'ownerEmail' | 'ownerName' | 'status'
  >;
}) {
  const session = useSession();
  const { ownerEmail, ownerName } = shipment;

  if (!ownerEmail) {
    return (
      <span className="text-muted-foreground">
        {isClaimable(shipment) ? 'Unclaimed' : '—'}
      </span>
    );
  }

  const label =
    ownerEmail === session?.email
      ? 'You'
      : ownerName
        ? shortName(ownerName)
        : ownerEmail;
  return (
    <span className="inline-flex items-center gap-1.5" title={ownerEmail}>
      <InitialsAvatar name={ownerName ?? ownerEmail} />
      {label}
    </span>
  );
}
