'use client';

import { useSearchParams } from 'next/navigation';
import { type RefObject, useEffect, useRef } from 'react';
import type { FilterChoice } from '@/components/common/filter-toolbar';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { PageHeader } from '@/components/common/page-header';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  statusFilterOptions,
} from '@/components/common/view-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { usePeek } from '@/hooks/use-peek';
import { useRecentCount } from '@/hooks/use-recent-count';
import { ALL, FREE_TEXT } from '@/lib/filters';
import type { LiveConnection } from '@/lib/live-status';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import type { ShipmentStatus } from '@/types/status';
import {
  useAdminShipmentStatusCounts,
  useAdminShipments,
  useAdminShipmentViewCounts,
} from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { AdminShipment, ListView } from '../types';
import {
  partyColumns,
  riskRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';
import {
  listScope,
  type ShipmentListMenu,
  ShipmentListToolbar,
} from './shipment-list-toolbar';
import { AdminShipmentPeek, ListPeek } from './shipment-peek';

const SLA_REFRESH_MS = 60_000;
const UPDATES_WINDOW_MS = 60_000;

function withAny(options: FilterChoice<string>[]): FilterChoice<string>[] {
  return [{ value: ALL, label: 'Any' }, ...options];
}

interface AdminMonitoringTableProps {
  carrierOptions: FilterChoice<string>[];
  sellerOptions: FilterChoice<string>[];
}

export function AdminMonitoringTable({
  carrierOptions,
  sellerOptions,
}: AdminMonitoringTableProps) {
  const carrierChoices = withAny(carrierOptions);
  const sellerChoices = withAny(sellerOptions);
  const list = useFilteredPagination(
    {
      view: 'active' as ListView | typeof ALL,
      status: ALL as StatusFilter<ShipmentStatus>,
      q: '',
      carrierId: ALL as string,
      sellerId: ALL as string,
    },
    {
      view: [ALL, 'active', 'exceptions'],
      status: [ALL, ...SHIPMENT_STATUSES],
      q: FREE_TEXT,
      carrierId: carrierChoices.map((choice) => choice.value),
      sellerId: sellerChoices.map((choice) => choice.value),
    },
    { viewKeys: ['view', 'status'] },
  );
  const { params } = list;
  const menus: ShipmentListMenu<typeof list.filters>[] = [
    { key: 'carrierId', label: 'Carrier', options: carrierChoices },
    { key: 'sellerId', label: 'Seller', options: sellerChoices },
  ];

  const recordUpdate = useRef<() => void>(undefined);
  const live = useShipmentTracking({
    subscribeToMonitoring: true,
    onEvent: () => recordUpdate.current?.(),
  });
  const scope = { carrierId: params.carrierId, sellerId: params.sellerId };
  const statusCounts = useAdminShipmentStatusCounts(scope, live.status).data;
  const viewCounts = useAdminShipmentViewCounts(scope, live.status).data;
  const [all, ...statusTabs] = statusFilterOptions(
    SHIPMENT_STATUS,
    SHIPMENT_STATUSES,
    { counts: statusCounts },
  );
  const tabs = [
    { ...all, key: 'view' as const },
    {
      key: 'view' as const,
      label: 'Active',
      value: 'active',
      count: viewCounts?.active,
    },
    {
      key: 'view' as const,
      label: 'Exceptions',
      value: 'exceptions',
      count: viewCounts?.exceptions,
    },
    ...statusTabs,
  ];
  const { isFiltered, view } = listScope(list, tabs);
  const query = useAdminShipments(
    { ...params, view: view as ListView | undefined },
    live.status,
  );
  const now = useNow(SLA_REFRESH_MS);
  const search = useSearchParams().toString();
  const rows = query.data?.data ?? [];
  const peek = usePeek(rows.map((s) => s.id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Monitoring"
        description="Every shipment on the platform, updated live."
        action={<RecentUpdates live={live} recordRef={recordUpdate} />}
      />
      <OfflineBanner status={live.status} />
      <ShipmentListToolbar
        list={list}
        tabs={tabs}
        menus={menus}
        placeholder="Code, city or seller"
        total={query.data?.meta.total}
      />

      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<AdminShipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={list.setPage}
            getRowClassName={riskRowClassName}
            getRowKey={(s) => s.id}
            getRowVersion={(s) => s.status}
            getRowHref={(s) =>
              `${ROUTES.adminShipment(s.id)}${search && `?${search}`}`
            }
            onRowClick={(s) => peek.open(s.id)}
            selectedKey={peek.peekId}
            emptyMessage={
              isFiltered ? 'No shipments match.' : 'No shipments in this view.'
            }
            columns={[
              shipmentColumns.trackingCode,
              partyColumns.seller,
              partyColumns.carrier,
              shipmentColumns.destination,
              shipmentColumns.status,
              { ...partyColumns.owner, hideBelow: '2xl' },
              slaColumn,
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
      <ListPeek peek={peek} rows={rows} hrefFor={ROUTES.adminShipment}>
        {(id) => <AdminShipmentPeek id={id} liveStatus={live.status} />}
      </ListPeek>
    </div>
  );
}

function RecentUpdates({
  live,
  recordRef,
}: {
  live: LiveConnection;
  recordRef: RefObject<(() => void) | undefined>;
}) {
  const { count, record } = useRecentCount(UPDATES_WINDOW_MS);

  useEffect(() => {
    recordRef.current = record;
  }, [recordRef, record]);

  return (
    <LiveIndicator
      live={live}
      detail={
        count > 0 ? `${plural(count, 'update')} in the last minute` : undefined
      }
      className="h-8.5 rounded-lg bg-card px-3 text-foreground shadow-xs"
    />
  );
}
