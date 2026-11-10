'use client';

import { useSession } from '@/hooks/use-session';
import { initialsFor } from '@/lib/initials';
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
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-foreground"
      >
        {initialsFor(ownerName ?? ownerEmail)}
      </span>
      {label}
    </span>
  );
}
