'use client';

import { type FilterChip, FilterChips } from '@/components/common/filter-chips';
import { FilterToolbar } from '@/components/common/filter-toolbar';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { SearchField } from '@/components/common/search-field';
import {
  type StatusFilter,
  type ViewTabOption,
  ViewTabs,
} from '@/components/common/view-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL, FREE_TEXT } from '@/lib/filters';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
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

type SellerFilters = {
  view: SellerView | typeof ALL;
  status: StatusFilter<ShipmentStatus>;
  q: string;
};

const DEFAULT_FILTERS: SellerFilters = { view: ALL, status: ALL, q: '' };
const VIEW_KEYS: (keyof SellerFilters)[] = ['view', 'status'];

const SLA_REFRESH_MS = 60_000;

export function ShipmentsTable() {
  const {
    filters,
    defaults,
    isFiltered: isSearching,
    setFilter,
    setFilters,
    setPage,
    params,
  } = useFilteredPagination(
    DEFAULT_FILTERS,
    {
      view: [ALL, 'active', 'exceptions'],
      status: [ALL, ...SHIPMENT_STATUSES],
      q: FREE_TEXT,
    },
    { viewKeys: VIEW_KEYS },
  );

  const query = useShipmentsList(params);
  const statusCounts = useShipmentStatusCounts().data;
  const viewCounts = useSellerViewCounts().data;
  const now = useNow(SLA_REFRESH_MS);
  const total = query.data?.meta.total;

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
  // A status link with no tab of its own (?status=IN_TRANSIT) is a filter, not a view.
  const strayStatus =
    filters.status !== ALL &&
    !tabs.some((tab) => tab.key === 'status' && tab.value === filters.status)
      ? filters.status
      : undefined;
  const isFiltered = isSearching || strayStatus !== undefined;
  const inView = filters.view !== ALL || filters.status !== ALL;
  const chips: FilterChip[] = [
    ...(strayStatus
      ? [
          {
            id: 'status',
            label: `Status: ${SHIPMENT_STATUS[strayStatus].label}`,
            onRemove: () => setFilter('status', ALL),
          },
        ]
      : []),
    ...(filters.q
      ? [
          {
            id: 'q',
            label: `Search: ${filters.q}`,
            onRemove: () => setFilter('q', ''),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <ViewTabs
        options={tabs}
        filters={filters}
        defaults={defaults}
        onChange={setFilters}
      />
      <FilterToolbar
        onClear={
          isFiltered
            ? () => setFilters({ q: '', ...(strayStatus && { status: ALL }) })
            : undefined
        }
        summary={
          total !== undefined && `${total} shipment${total === 1 ? '' : 's'}`
        }
      >
        <SearchField
          value={filters.q}
          onChange={(q) => setFilter('q', q)}
          placeholder="Code, city or zip"
        />
      </FilterToolbar>
      <FilterChips chips={chips} />
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<Shipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={setPage}
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
