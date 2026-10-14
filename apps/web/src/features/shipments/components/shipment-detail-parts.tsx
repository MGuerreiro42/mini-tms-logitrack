import type { ReactNode } from 'react';
import { DetailRow } from '@/components/common/detail-row';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import type { LiveStatus } from '@/lib/live-status';
import type { TimelineEvent } from '@/types/status';
import type { ShipmentAddress, ShipmentBase } from '../types';

export function ShipmentHeaderCard({
  shipment,
  liveStatus,
  children,
}: {
  shipment: ShipmentBase;
  liveStatus: LiveStatus;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {shipment.trackingCode}
          <ShipmentStatusPill status={shipment.status} />
          <LiveIndicator status={liveStatus} className="ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <OfflineBanner status={liveStatus} />
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
