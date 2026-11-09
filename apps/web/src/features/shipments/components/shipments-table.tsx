'use client';

import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import type {
  StatusFilter,
  ViewTabOption,
} from '@/components/common/view-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL, FREE_TEXT } from '@/lib/filters';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUSES } from '@/lib/status-colors';
import { sumRecord } from '@/lib/sum-record';
import { useShipmentStatusCounts } from '../hooks/use-shipment-status-counts';
import { useShipmentsList } from '../hooks/use-shipments-list';
import { useSellerViewCounts } from '../hooks/use-view-counts';
import type { SellerView, Shipment, ShipmentStatus } from '../types';
import {
  partyColumns,
  riskRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';
import { listScope, ShipmentListToolbar } from './shipment-list-toolbar';

type SellerFilters = {
  view: SellerView | typeof ALL;
  status: StatusFilter<ShipmentStatus>;
  q: string;
};

const DEFAULT_FILTERS: SellerFilters = { view: ALL, status: ALL, q: '' };
const VIEW_KEYS: (keyof SellerFilters)[] = ['view', 'status'];

const SLA_REFRESH_MS = 60_000;

export function ShipmentsTable() {
  const list = useFilteredPagination(
    DEFAULT_FILTERS,
    {
      view: [ALL, 'active', 'exceptions'],
      status: [ALL, ...SHIPMENT_STATUSES],
      q: FREE_TEXT,
    },
    { viewKeys: VIEW_KEYS },
  );

  const statusCounts = useShipmentStatusCounts().data;
  const viewCounts = useSellerViewCounts().data;
  const now = useNow(SLA_REFRESH_MS);

  const tabs: ViewTabOption<'view' | 'status'>[] = [
    {
      key: 'view',
      label: 'All',
      value: ALL,
      count: statusCounts && sumRecord(statusCounts),
    },
    {
      key: 'view',
      label: 'Active',
      value: 'active',
      count: viewCounts?.active,
    },
    {
      key: 'view',
      label: 'Exceptions',
      value: 'exceptions',
      count: viewCounts?.exceptions,
    },
    {
      key: 'status',
      label: 'Delivered',
      value: 'DELIVERED',
      count: statusCounts?.DELIVERED,
    },
    {
      key: 'status',
      label: 'Cancelled',
      value: 'CANCELLED',
      count: statusCounts?.CANCELLED,
    },
  ];
  const { isFiltered, view } = listScope(list, tabs);
  const query = useShipmentsList({
    ...list.params,
    view: view as SellerView | undefined,
  });
  const inView = list.filters.view !== ALL || list.filters.status !== ALL;

  return (
    <div className="space-y-4">
      <ShipmentListToolbar
        list={list}
        tabs={tabs}
        placeholder="Code, city or zip"
        total={query.data?.meta.total}
      />
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<Shipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={list.setPage}
            getRowClassName={riskRowClassName}
            getRowKey={(shipment) => shipment.id}
            getRowHref={(shipment) => ROUTES.sellerShipment(shipment.id)}
            emptyMessage={
              isFiltered
                ? 'No shipments match.'
                : inView
                  ? 'No shipments in this view.'
                  : 'No shipments yet. Create your first one.'
            }
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.destination,
              partyColumns.carrier,
              partyColumns.modality,
              shipmentColumns.status,
              slaColumn,
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
