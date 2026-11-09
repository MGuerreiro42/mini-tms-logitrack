import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { DetailRow } from '@/components/common/detail-row';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { SlaCell } from '@/components/common/sla-cell';
import { TrackingCode } from '@/components/common/tracking-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import { useNow } from '@/hooks/use-now';
import { formatCep } from '@/lib/br-documents';
import { formatShortDateTime } from '@/lib/format-date';
import type { LiveConnection } from '@/lib/live-status';
import { hasSlaVerdict, slaState } from '@/lib/sla';
import type { ShipmentStatus, TimelineEvent } from '@/types/status';
import type { ShipmentAddress, ShipmentBase } from '../types';

export function ShipmentTitle({
  shipment,
  live,
  back,
  meta,
  children,
}: {
  shipment: ShipmentBase;
  live: LiveConnection;
  back: { href: string; label: string };
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Breadcrumb parent={back}>
        <TrackingCode code={shipment.trackingCode} />
      </Breadcrumb>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
          <TrackingCode code={shipment.trackingCode} />
        </h1>
        <ShipmentStatusBadge status={shipment.status} />
        {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        <LiveIndicator live={live} className="ml-auto" />
      </div>
      {children && (
        <p className="text-[15px] text-muted-foreground">{children}</p>
      )}
      <OfflineBanner status={live.status} />
    </div>
  );
}

const SLA_REFRESH_MS = 60_000;

export function ShipmentDueLine({
  shipment,
}: {
  shipment: Pick<
    ShipmentBase,
    'modalityName' | 'dueAt' | 'deliveredAt' | 'status'
  >;
}) {
  const now = useNow(SLA_REFRESH_MS);
  const { modalityName, dueAt, deliveredAt, status } = shipment;

  if (!dueAt) return <>{modalityName} · No SLA</>;
  if (!hasSlaVerdict(status)) {
    return (
      <>
        {modalityName} · Due {formatShortDateTime(dueAt)}
      </>
    );
  }
  return (
    <>
      {modalityName} ·{' '}
      <SlaCell state={slaState({ dueAt, deliveredAt, status, now })} /> ·{' '}
      {formatShortDateTime(dueAt)}
    </>
  );
}

export function ShipmentHeaderCard({
  shipment,
  live,
  children,
}: {
  shipment: ShipmentBase;
  live: LiveConnection;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrackingCode code={shipment.trackingCode} />
          <ShipmentStatusBadge status={shipment.status} />
          <LiveIndicator live={live} className="ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <OfflineBanner status={live.status} />
        <div className="pt-1 pb-3">
          <ShipmentStepper
            status={shipment.status}
            events={shipment.trackingEvents}
          />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function ShipmentAddressRows({ address }: { address: ShipmentAddress }) {
  return (
    <>
      <DetailRow
        label="Address"
        value={`${address.addressStreet}, ${address.addressNumber}`}
      />
      <DetailRow label="Neighborhood" value={address.addressNeighborhood} />
      <DetailRow
        label="City"
        value={`${address.addressCity}/${address.addressState}`}
      />
      <DetailRow
        label="Zip code"
        value={formatCep(address.addressZipCode)}
        mono
      />
    </>
  );
}

export function ShipmentTimelineCard({
  events = [],
  status,
}: {
  events?: TimelineEvent[];
  status: ShipmentStatus;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <TrackingTimeline events={events} status={status} />
      </CardContent>
    </Card>
  );
}
