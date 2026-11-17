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
import { TrackingCode } from '@/components/common/tracking-code';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import { useAppOrigin } from '@/hooks/use-app-origin';
import { useRememberRecent } from '@/hooks/use-recents';
import { formatCep } from '@/lib/br-documents';
import { formatDateTime } from '@/lib/format-date';
import type { LiveConnection } from '@/lib/live-status';
import { publicTrackingPath } from '@/lib/public-tracking-path';
import { ROUTES } from '@/lib/routes';
import { shipmentKeys } from '../api/keys';
import { useShipment } from '../hooks/use-shipment';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { isCancellableBySeller, type ShipmentDetail } from '../types';
import { CancelShipmentAction } from './cancel-shipment-action';
import { ShipmentDueLine } from './shipment-detail-parts';
import { ShipmentMapPanel } from './shipment-map-panel';

export function ShipmentDetailCard({ id }: { id: string }) {
  const live = useShipmentTracking({ shipmentId: id });
  const query = useShipment(id, live.status);
  useRememberRecent(query.data?.trackingCode);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this shipment."
      notFoundMessage="Shipment not found."
    >
      {(shipment) => <ShipmentDetailView shipment={shipment} live={live} />}
    </QueryState>
  );
}

function ShipmentDetailView({
  shipment,
  live,
}: {
  shipment: ShipmentDetail;
  live: LiveConnection;
}) {
  const origin = useAppOrigin();
  const trackingUrl = `${origin}${publicTrackingPath(shipment.trackingCode)}`;
  const place = `${shipment.addressCity}, ${shipment.addressState}`;
  const cancellable = isCancellableBySeller(shipment.status);

  return (
    <div className="space-y-5">
      <Breadcrumb parent={{ href: ROUTES.sellerShipments, label: 'Shipments' }}>
        <TrackingCode code={shipment.trackingCode} />
      </Breadcrumb>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3.5">
            <TrackingCode
              code={shipment.trackingCode}
              className="font-medium"
            />
            <ShipmentStatusBadge status={shipment.status} />
          </span>
        }
        description={
          <>
            {place} · <ShipmentDueLine shipment={shipment} />
          </>
        }
        action={
          <PinnedAction pinned={cancellable}>
            <CancelShipmentAction
              shipmentId={shipment.id}
              status={shipment.status}
              available={cancellable}
            />
          </PinnedAction>
        }
      />
      <OfflineBanner status={live.status} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Progress" aside={<LiveIndicator live={live} />}>
            <ShipmentStepper
              status={shipment.status}
              events={shipment.trackingEvents}
            />
          </Panel>
          <ShipmentMapPanel
            shipment={shipment}
            queryKey={shipmentKeys.detail(shipment.id)}
          />
          <Panel title="Delivery">
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-y-3 text-sm md:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">Destination</dt>
              <dd>
                {shipment.addressStreet}, {shipment.addressNumber}
                {shipment.addressComplement &&
                  ` · ${shipment.addressComplement}`}{' '}
                · {shipment.addressNeighborhood}, {place} ·{' '}
                <span className="font-mono">
                  {formatCep(shipment.addressZipCode)}
                </span>
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
