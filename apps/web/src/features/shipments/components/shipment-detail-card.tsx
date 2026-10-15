'use client';

import { CopyField } from '@/components/common/copy-field';
import { DetailRow } from '@/components/common/detail-row';
import { QueryState } from '@/components/common/query-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppOrigin } from '@/hooks/use-app-origin';
import type { LiveStatus } from '@/lib/live-status';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { useShipment } from '../hooks/use-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { isCancellableBySeller, type Shipment } from '../types';
import { CancelShipmentAction } from './cancel-shipment-action';
import {
  ShipmentAddressRows,
  ShipmentHeaderCard,
  ShipmentTimelineCard,
} from './shipment-detail-parts';

export function ShipmentDetailCard({ id }: { id: string }) {
  const liveStatus = useShipmentTracking({ shipmentId: id });
  const query = useShipment(id, liveStatus);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found."
    >
      {(shipment) => (
        <ShipmentDetailView shipment={shipment} liveStatus={liveStatus} />
      )}
    </QueryState>
  );
}

function ShipmentDetailView({
  shipment,
  liveStatus,
}: {
  shipment: Shipment;
  liveStatus: LiveStatus;
}) {
  const origin = useAppOrigin();
  const trackingUrl = `${origin}${publicTrackingPath(shipment.trackingCode)}`;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <ShipmentHeaderCard shipment={shipment} liveStatus={liveStatus}>
        <DetailRow label="Carrier" value={shipment.carrierName} />
        <DetailRow label="Modality" value={shipment.modalityName} />
        <ShipmentAddressRows address={shipment} />
      </ShipmentHeaderCard>
      <div className="space-y-4">
        {isCancellableBySeller(shipment.status) && (
          <CancelShipmentAction shipmentId={shipment.id} />
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Public tracking link</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyField
              value={trackingUrl}
              label="Copy tracking link"
              copiedMessage="Link copied"
              failedMessage="Couldn't copy the link"
            />
          </CardContent>
        </Card>
        <ShipmentTimelineCard events={shipment.trackingEvents} />
      </div>
    </div>
  );
}
