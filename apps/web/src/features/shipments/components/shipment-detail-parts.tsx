import type { ReactNode } from 'react';
import { DetailRow } from '@/components/common/detail-row';
import { LiveIndicator } from '@/components/common/live-indicator';
import { TrackingTimeline } from '@/components/common/tracking-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import type { TimelineEvent } from '@/types/status';
import type { ShipmentAddress, ShipmentBase } from '../types';

export function ShipmentHeaderCard({
  shipment,
  children,
}: {
  shipment: ShipmentBase;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {shipment.trackingCode}
          <ShipmentStatusPill status={shipment.status} />
          <LiveIndicator className="ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
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
      <DetailRow label="Zip code" value={address.addressZipCode} mono />
    </>
  );
}

export function ShipmentTimelineCard({
  events = [],
}: {
  events?: TimelineEvent[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <TrackingTimeline events={events} />
      </CardContent>
    </Card>
  );
}
