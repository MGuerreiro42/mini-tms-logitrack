'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { useShipment } from '../hooks/use-shipment';

export function ShipmentDetailCard({ id }: { id: string }) {
  const { data: shipment, isLoading } = useShipment(id);

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
          <Row label="Carrier" value={shipment.carrierName} />
          <Row label="Modality" value={shipment.modalityName} />
          <Row
            label="Address"
            value={`${shipment.addressStreet}, ${shipment.addressNumber}`}
          />
          <Row label="Neighborhood" value={`${shipment.addressNeighborhood}`} />
          <Row
            label="City"
            value={`${shipment.addressCity}/${shipment.addressState}`}
          />
          <Row label="Zip code" value={shipment.addressZipCode} mono />
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
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Current scope: address + status + carrier/modality only. The real-time
          TrackingEvent timeline is part of the carrier-side queue work, still
          deferred.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}
