'use client';

import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { PageHeader } from '@/components/common/page-header';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import type { StatusFilter } from '@/components/common/view-tabs';
import { Button } from '@/components/ui/button';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { usePeek } from '@/hooks/use-peek';
import { ALL, FREE_TEXT } from '@/lib/filters';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUSES } from '@/lib/status-colors';
import { useClaimNext } from '../hooks/use-claim-next';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useShipmentQueue } from '../hooks/use-shipment-queue';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import { useQueueViewCounts } from '../hooks/use-view-counts';
import {
  CARRIER_VIEWS,
  type CarrierShipment,
  type CarrierView,
  isClaimable,
  type ShipmentStatus,
} from '../types';
import {
  partyColumns,
  riskRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';
import { listScope, ShipmentListToolbar } from './shipment-list-toolbar';
import { CarrierShipmentPeek, ListPeek } from './shipment-peek';

const VIEW_LABELS: Record<CarrierView, string> = {
  mine: 'Mine',
  unclaimed: 'Unclaimed',
  to_pick_up: 'To pick up',
  on_the_road: 'On the road',
  exceptions: 'Exceptions',
  done: 'Done',
};

const SLA_REFRESH_MS = 60_000;

export function CarrierQueueTable({
  defaultView,
}: {
  defaultView: CarrierView;
}) {
  const list = useFilteredPagination(
    {
      view: defaultView,
      status: ALL as StatusFilter<ShipmentStatus>,
      q: '',
    },
    {
      view: CARRIER_VIEWS,
      status: [ALL, ...SHIPMENT_STATUSES],
      q: FREE_TEXT,
    },
    { viewKeys: ['view', 'status'] },
  );
  const counts = useQueueViewCounts().data;
  const tabs = CARRIER_VIEWS.map((view) => ({
    key: 'view' as const,
    label: VIEW_LABELS[view],
    value: view,
    count: counts?.[view],
  }));
  const { isFiltered, view } = listScope(list, tabs);

  const live = useShipmentTracking({ subscribeToQueue: true });
  const query = useShipmentQueue(
    { ...list.params, view: view as CarrierView | undefined },
    live.status,
  );
  const now = useNow(SLA_REFRESH_MS);
  const claim = useClaimShipment();
  const rows = query.data?.data ?? [];
  const peek = usePeek(rows.map((s) => s.id));
  const next = useClaimNext();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Queue"
        description="Shared across your company. Claim an unowned shipment to work on it."
        action={
          <div className="flex items-center gap-4">
            <LiveIndicator live={live} />
            <Button
              disabled={!counts?.unclaimed || next.isPending}
              onClick={next.claimNext}
            >
              Claim next · {counts?.unclaimed ?? 0}
            </Button>
          </div>
        }
      />
      <OfflineBanner status={live.status} />
      <ShipmentListToolbar
        list={list}
        tabs={tabs}
        placeholder="Code, city or seller"
        total={query.data?.meta.total}
      />
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load the queue."
      >
        {(result) => (
          <PaginatedTable<WithSla<CarrierShipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={list.setPage}
            getRowClassName={riskRowClassName}
            getRowKey={(s) => s.id}
            getRowVersion={(s) => s.status}
            getRowHref={(s) => ROUTES.carrierShipment(s.id)}
            onRowClick={(s) => peek.open(s.id)}
            selectedKey={peek.peekId}
            emptyMessage={
              isFiltered ? 'No shipments match.' : 'No shipments in this view.'
            }
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              partyColumns.seller,
              shipmentColumns.destination,
              slaColumn,
              // Every row of Mine is the caller's own (decision 10.3).
              ...(view === 'mine' ? [] : [partyColumns.owner]),
              {
                id: 'actions',
                header: '',
                card: 'action',
                className: 'text-right',
                cell: (s) =>
                  isClaimable(s) ? (
                    <Button
                      size="sm"
                      className="relative z-10 pointer-coarse:px-4"
                      aria-label={`Claim ${s.trackingCode}`}
                      onClick={() => claim.mutate(s.id)}
                      disabled={claim.isPending && claim.variables === s.id}
                    >
                      Claim
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </QueryState>
      <ListPeek peek={peek} rows={rows} hrefFor={ROUTES.carrierShipment}>
        {(id) => <CarrierShipmentPeek id={id} liveStatus={live.status} />}
      </ListPeek>
    </div>
  );
}
