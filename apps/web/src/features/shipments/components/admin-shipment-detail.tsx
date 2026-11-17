'use client';

import { useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { DetailRow } from '@/components/common/detail-row';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { TrackingTimeline } from '@/features/tracking/components/tracking-timeline';
import { useRememberRecent } from '@/hooks/use-recents';
import type { LiveConnection } from '@/lib/live-status';
import { ROUTES } from '@/lib/routes';
import { useAdminShipment } from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { type AdminShipmentDetail as Detail, ownerLabel } from '../types';
import {
  ShipmentAddressRows,
  ShipmentDueLine,
  ShipmentTitle,
} from './shipment-detail-parts';

// Live through the monitoring room the admin already joins; no per-shipment room.
export function AdminShipmentDetail({ id }: { id: string }) {
  const live = useShipmentTracking({ subscribeToMonitoring: true });
  const query = useAdminShipment(id, live.status);
  useRememberRecent(query.data?.trackingCode);
  // The monitoring row passes its filters along, so the way back lands on the same page.
  const filters = useSearchParams().toString();
  const back = {
    href: filters
      ? `${ROUTES.adminMonitoring}?${filters}`
      : ROUTES.adminMonitoring,
    label: 'Monitoring',
  };

  return (
    <div className="flex flex-col gap-5">
      {query.data === undefined && (
        <Breadcrumb parent={back}>Shipment</Breadcrumb>
      )}
      <QueryState
        query={query}
        errorMessage="Couldn't load this shipment."
        notFoundMessage="Shipment not found."
      >
        {(shipment) => (
          <AdminShipmentView shipment={shipment} live={live} back={back} />
        )}
      </QueryState>
    </div>
  );
}

function AdminShipmentView({
  shipment,
  live,
  back,
}: {
  shipment: Detail;
  live: LiveConnection;
  back: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-5">
      <ShipmentTitle shipment={shipment} live={live} back={back}>
        <ShipmentDueLine shipment={shipment} />
      </ShipmentTitle>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Progress">
            <ShipmentStepper
              status={shipment.status}
              events={shipment.trackingEvents}
            />
          </Panel>
          <Panel title="Parties" className="flex-1 gap-2 text-sm">
            <div>
              <DetailRow label="Seller" value={shipment.sellerCompanyName} />
              <DetailRow label="Seller contact" value={shipment.sellerEmail} />
              <DetailRow label="Carrier" value={shipment.carrierName} />
              <DetailRow label="Owner" value={ownerLabel(shipment)} />
              <ShipmentAddressRows address={shipment} />
            </div>
          </Panel>
        </div>
        <Panel title="Timeline">
          <TrackingTimeline
            events={shipment.trackingEvents}
            status={shipment.status}
          />
        </Panel>
      </div>
    </div>
  );
}
