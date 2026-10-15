'use client';

import { Breadcrumb } from '@/components/common/breadcrumb';
import { CopyField } from '@/components/common/copy-field';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
import { PinnedAction } from '@/components/common/pinned-action';
import { QueryState } from '@/components/common/query-state';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import { useAppOrigin } from '@/hooks/use-app-origin';
import { formatDate, formatDateTime } from '@/lib/format-date';
import type { LiveStatus } from '@/lib/live-status';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { ROUTES } from '@/lib/routes';
import { useShipment } from '../hooks/use-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { isCancellableBySeller, type Shipment } from '../types';
import { CancelShipmentAction } from './cancel-shipment-action';

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
  const place = `${shipment.addressCity}, ${shipment.addressState}`;
  const cancellable = isCancellableBySeller(shipment.status);
  const cancelAction = (
    <CancelShipmentAction
      shipmentId={shipment.id}
      status={shipment.status}
      available={cancellable}
    />
  );

  return (
    <div className="space-y-5">
      <Breadcrumb parent={{ href: ROUTES.sellerShipments, label: 'Shipments' }}>
        <span className="font-mono">{shipment.trackingCode}</span>
      </Breadcrumb>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3.5">
            <span className="font-mono font-medium">
              {shipment.trackingCode}
            </span>
            <ShipmentStatusBadge status={shipment.status} />
          </span>
        }
        description={
          <>
            {shipment.modalityName} to {place}
            {shipment.dueAt && ` · due ${formatDate(shipment.dueAt)}`}
          </>
        }
        action={
          <PinnedAction pinned={cancellable}>{cancelAction}</PinnedAction>
        }
      />
      <OfflineBanner status={liveStatus} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Progress" aside={<LiveIndicator status={liveStatus} />}>
            <ShipmentStepper
              status={shipment.status}
              events={shipment.trackingEvents}
            />
          </Panel>
          <Panel title="Delivery">
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-y-3 text-sm md:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Destination</dt>
              <dd>
                {shipment.addressStreet}, {shipment.addressNumber}
                {shipment.addressComplement &&
                  ` · ${shipment.addressComplement}`}{' '}
                · {shipment.addressNeighborhood}, {place} ·{' '}
                <span className="font-mono">{shipment.addressZipCode}</span>
              </dd>
              <dt className="text-muted-foreground">Carrier</dt>
              <dd className="font-semibold">{shipment.carrierName}</dd>
              <dt className="text-muted-foreground">Modality</dt>
              <dd>{shipment.modalityName}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(shipment.createdAt)}</dd>
            </dl>
          </Panel>
          <Panel title="Public tracking link">
            <CopyField
              value={trackingUrl}
              label="Copy tracking link"
              copiedMessage="Link copied"
              failedMessage="Couldn't copy the link"
            />
          </Panel>
        </div>
        <Panel title="Timeline">
          <TrackingTimeline
            events={shipment.trackingEvents ?? []}
            status={shipment.status}
          />
        </Panel>
      </div>
    </div>
  );
}
