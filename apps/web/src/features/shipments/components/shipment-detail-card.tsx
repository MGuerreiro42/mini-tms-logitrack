'use client';

import { DetailRow } from '@/components/common/detail-row';
import { TrackingTimeline } from '@/components/common/tracking-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { useShipment } from '../hooks/use-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';

export function ShipmentDetailCard({ id }: { id: string }) {
  const { data: shipment, isLoading } = useShipment(id);
  useShipmentTracking({ shipmentId: id });

  if (isLoading || !shipment) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {shipment.trackingCode}
            <ShipmentStatusPill status={shipment.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DetailRow label="Carrier" value={shipment.carrierName} />
          <DetailRow label="Modality" value={shipment.modalityName} />
          <DetailRow
            label="Address"
            value={`${shipment.addressStreet}, ${shipment.addressNumber}`}
          />
          <DetailRow
            label="Neighborhood"
            value={`${shipment.addressNeighborhood}`}
          />
          <DetailRow
            label="City"
            value={`${shipment.addressCity}/${shipment.addressState}`}
          />
          <DetailRow label="Zip code" value={shipment.addressZipCode} mono />
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Public tracking link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs">
              tms.app/track/{shipment.trackingCode}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <TrackingTimeline events={shipment.trackingEvents ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
