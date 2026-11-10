'use client';

import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { TextLink } from '@/components/common/text-link';
import { useNow } from '@/hooks/use-now';
import type { LiveStatus } from '@/lib/live-status';
import { ROUTES } from '@/lib/routes';
import { useRecentShipments } from '../hooks/use-admin-shipments';
import type { AdminShipment } from '../types';
import {
  partyColumns,
  riskRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';

const SLA_REFRESH_MS = 60_000;

// The tenant's ten newest shipments with monitoring's columns; the other party names the counterpart.
export function RecentShipments({
  scope,
  liveStatus,
}: {
  scope: { sellerId: string } | { carrierId: string };
  liveStatus: LiveStatus;
}) {
  const query = useRecentShipments(scope, liveStatus);
  const now = useNow(SLA_REFRESH_MS);
  const total = query.data?.meta.total;

  return (
    <section aria-labelledby="recent-shipments" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-shipments" className="text-base font-semibold">
          Recent shipments
        </h2>
        {total !== undefined && total > 0 && (
          <TextLink
            href={`${ROUTES.adminMonitoring}?${new URLSearchParams(scope)}`}
            className="text-[13px]"
          >
            All {total} in Monitoring →
          </TextLink>
        )}
      </div>
      <QueryState
        query={query}
        skeleton={<QuerySkeleton variant="table" />}
        errorMessage="Couldn't load the recent shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<AdminShipment>>
            data={withSla(result.data, now)}
            getRowKey={(s) => s.id}
            getRowVersion={(s) => s.status}
            getRowClassName={riskRowClassName}
            getRowHref={(s) => ROUTES.adminShipment(s.id)}
            emptyMessage="No shipments yet."
            columns={[
              shipmentColumns.trackingCode,
              'sellerId' in scope ? partyColumns.carrier : partyColumns.seller,
              shipmentColumns.destination,
              shipmentColumns.status,
              slaColumn,
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </section>
  );
}
