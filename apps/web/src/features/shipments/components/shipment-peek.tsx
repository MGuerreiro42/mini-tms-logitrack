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
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import { useShipment } from '../hooks/use-shipment';
import type { ShipmentBase } from '../types';

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

interface ShipmentPeekBodyProps {
  shipment: ShipmentBase;
  // Role-specific rows after Destination, as label/value pairs.
  details: [string, ReactNode][];
  href: string;
  actions?: ReactNode;
}

export function ShipmentPeekBody({
  shipment,
  details,
  href,
  actions,
}: ShipmentPeekBodyProps) {
  const now = useNow(SLA_REFRESH_MS);
  const rows: [string, ReactNode][] = [
    [
      'Destination',
      `${shipment.addressCity}/${shipment.addressState} · ${shipment.addressNeighborhood}`,
    ],
    ...details,
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <TrackingCode code={shipment.trackingCode} className="font-medium" />
        <ShipmentStatusBadge status={shipment.status} />
        <RiskBadge state={slaState({ ...shipment, now })} />
      </div>
      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-2.5 text-sm">
        {rows.map(([label, value]) => (
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
        {actions}
        <Button asChild variant="secondary">
          <Link href={href}>Open shipment</Link>
        </Button>
      </div>
    </div>
  );
}

export function SellerShipmentPeek({ id }: { id: string }) {
  // The seller list has no live connection; the peek refetches through invalidation.
  const query = useShipment(id, 'live');
  const origin = useAppOrigin();

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found"
    >
      {(shipment) => (
        <ShipmentPeekBody
          shipment={shipment}
          href={ROUTES.sellerShipment(shipment.id)}
          details={[
            ['Carrier', shipment.carrierName],
            ['Modality', shipment.modalityName],
          ]}
          actions={
            <CopyField
              value={`${origin}${publicTrackingPath(shipment.trackingCode)}`}
              label="Copy tracking link"
              copiedMessage="Link copied"
              failedMessage="Couldn't copy the link"
            />
          }
        />
      )}
    </QueryState>
  );
}
