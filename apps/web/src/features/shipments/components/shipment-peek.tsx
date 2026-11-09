'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyField } from '@/components/common/copy-field';
import { PeekSheet } from '@/components/common/peek-sheet';
import { QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { TrackingCode } from '@/components/common/tracking-code';
import { Button } from '@/components/ui/button';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import { useAppOrigin } from '@/hooks/use-app-origin';
import { useNow } from '@/hooks/use-now';
import type { Peek } from '@/hooks/use-peek';
import type { LiveStatus } from '@/lib/live-status';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import type { QuerySource } from '@/types/query';
import { useAdminShipment } from '../hooks/use-admin-shipments';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useQueueShipment } from '../hooks/use-queue-shipment';
import { useShipment } from '../hooks/use-shipment';
import { isClaimable, type ShipmentBase } from '../types';
import { OwnerChip } from './owner-chip';

const SLA_REFRESH_MS = 60_000;
const EVENTS_SHOWN = 3;

interface ListPeekProps {
  peek: Peek;
  rows: Pick<ShipmentBase, 'id' | 'trackingCode'>[];
  hrefFor: (id: string) => string;
  children: (id: string) => ReactNode;
}

export function ListPeek({ peek, rows, hrefFor, children }: ListPeekProps) {
  const { peekId } = peek;
  if (!peekId) return null;
  const code = rows.find((row) => row.id === peekId)?.trackingCode;
  return (
    <PeekSheet
      peek={peek}
      label={`${code ?? 'Shipment'} preview`}
      href={hrefFor(peekId)}
    >
      {children(peekId)}
    </PeekSheet>
  );
}

interface ShipmentPeekBodyProps<T extends ShipmentBase> {
  query: QuerySource<T>;
  href: string;
  // Role-specific rows after Destination, as label/value pairs.
  details: (shipment: T) => [string, ReactNode][];
  actions: (shipment: T) => ReactNode;
}

export function ShipmentPeekBody<T extends ShipmentBase>({
  query,
  href,
  details,
  actions,
}: ShipmentPeekBodyProps<T>) {
  const now = useNow(SLA_REFRESH_MS);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found"
    >
      {(shipment) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <TrackingCode
              code={shipment.trackingCode}
              className="font-medium"
            />
            <ShipmentStatusBadge status={shipment.status} />
            <RiskBadge state={slaState({ ...shipment, now })} />
          </div>
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-2.5 text-sm">
            {[
              [
                'Destination',
                `${shipment.addressCity}/${shipment.addressState} · ${shipment.addressNeighborhood}`,
              ] as [string, ReactNode],
              ...details(shipment),
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <section aria-label="Latest updates">
            <TrackingTimeline
              events={(shipment.trackingEvents ?? []).slice(-EVENTS_SHOWN)}
              status={shipment.status}
            />
          </section>
          <div className="flex flex-col gap-2.5">
            {actions(shipment)}
            <Button asChild variant="secondary">
              <Link href={href}>Open shipment</Link>
            </Button>
          </div>
        </div>
      )}
    </QueryState>
  );
}

function CopyLink({ value, label }: { value: string; label: string }) {
  return (
    <CopyField
      value={value}
      label={label}
      copiedMessage="Link copied"
      failedMessage="Couldn't copy the link"
    />
  );
}

export function SellerShipmentPeek({ id }: { id: string }) {
  // The seller list has no live connection; the peek refetches through invalidation.
  const query = useShipment(id, 'live');
  const origin = useAppOrigin();

  return (
    <ShipmentPeekBody
      query={query}
      href={ROUTES.sellerShipment(id)}
      details={(shipment) => [
        ['Carrier', shipment.carrierName],
        ['Modality', shipment.modalityName],
      ]}
      actions={(shipment) => (
        <CopyLink
          value={`${origin}${publicTrackingPath(shipment.trackingCode)}`}
          label="Copy tracking link"
        />
      )}
    />
  );
}

export function CarrierShipmentPeek({
  id,
  liveStatus,
}: {
  id: string;
  liveStatus: LiveStatus;
}) {
  const query = useQueueShipment(id, liveStatus);
  const claim = useClaimShipment();

  return (
    <ShipmentPeekBody
      query={query}
      href={ROUTES.carrierShipment(id)}
      details={(shipment) => [
        ['Seller', shipment.sellerCompanyName],
        ['Owner', <OwnerChip key="owner" shipment={shipment} />],
      ]}
      actions={(shipment) =>
        isClaimable(shipment) && (
          <Button
            disabled={claim.isPending}
            onClick={() => claim.mutate(shipment.id)}
          >
            {claim.isPending ? 'Claiming…' : 'Claim'}
          </Button>
        )
      }
    />
  );
}

export function AdminShipmentPeek({
  id,
  href,
  liveStatus,
}: {
  id: string;
  // The detail page with the list's filters, like the row link.
  href: string;
  liveStatus: LiveStatus;
}) {
  const query = useAdminShipment(id, liveStatus);
  const origin = useAppOrigin();

  return (
    <ShipmentPeekBody
      query={query}
      href={href}
      details={(shipment) => [
        ['Seller', shipment.sellerCompanyName],
        ['Carrier', shipment.carrierName],
        ['Owner', <OwnerChip key="owner" shipment={shipment} />],
      ]}
      actions={() => (
        <CopyLink
          value={`${origin}${ROUTES.adminShipment(id)}`}
          label="Copy link"
        />
      )}
    />
  );
}
