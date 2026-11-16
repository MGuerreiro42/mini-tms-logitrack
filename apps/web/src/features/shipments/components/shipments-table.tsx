'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import type {
  StatusFilter,
  ViewTabOption,
} from '@/components/common/view-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { usePeek } from '@/hooks/use-peek';
import { STATS_WINDOWS, type StatsWindow } from '@/hooks/use-stats-window';
import { ALL, FREE_TEXT } from '@/lib/filters';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUSES } from '@/lib/status-colors';
import { sumRecord } from '@/lib/sum-record';
import { useShipmentStatusCounts } from '../hooks/use-shipment-status-counts';
import { useShipmentsList } from '../hooks/use-shipments-list';
import { useSellerViewCounts } from '../hooks/use-view-counts';
import type { ListView, Shipment, ShipmentStatus } from '../types';
import { BulkActionBar } from './bulk-action-bar';
import {
  partyColumns,
  riskRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';
import { listScope, ShipmentListToolbar } from './shipment-list-toolbar';
import { ListPeek, SellerShipmentPeek } from './shipment-peek';

type SellerFilters = {
  view: ListView | typeof ALL;
  status: StatusFilter<ShipmentStatus>;
  q: string;
  window: StatsWindow | typeof ALL;
};

const DEFAULT_FILTERS: SellerFilters = {
  view: ALL,
  status: ALL,
  q: '',
  window: ALL,
};
const VIEW_KEYS: (keyof SellerFilters)[] = ['view', 'status'];

const SLA_REFRESH_MS = 60_000;
const NO_KEYS: ReadonlySet<string> = new Set();

export function ShipmentsTable() {
  const list = useFilteredPagination(
    DEFAULT_FILTERS,
    {
      view: [ALL, 'active', 'late', 'exceptions'],
      status: [ALL, ...SHIPMENT_STATUSES],
      q: FREE_TEXT,
      window: [ALL, ...STATS_WINDOWS],
    },
    { viewKeys: VIEW_KEYS },
  );

  const statusCounts = useShipmentStatusCounts(list.params.window).data;
  const viewCounts = useSellerViewCounts(list.params.window).data;
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
      label: 'Late',
      value: 'late',
      count: viewCounts?.late,
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
    view: view as ListView | undefined,
  });
  const inView = list.filters.view !== ALL || list.filters.status !== ALL;
  const rows = query.data?.data ?? [];
  const peek = usePeek(rows.map((shipment) => shipment.id));
  // Selection belongs to one page of one view: any other list clears it.
  const scope = JSON.stringify(list.params);
  const [selection, setSelection] = useState({
    scope,
    keys: new Set<string>(),
  });
  const selectedKeys = selection.scope === scope ? selection.keys : NO_KEYS;
  const select = (keys: Set<string>) => setSelection({ scope, keys });
  const selected = rows.filter((shipment) => selectedKeys.has(shipment.id));

  return (
    <div className="space-y-4">
      <ShipmentListToolbar
        list={list}
        tabs={tabs}
        placeholder="Code, city or zip"
        total={query.data?.meta.total}
        replacement={
          selected.length > 0 ? (
            <BulkActionBar
              selected={selected}
              onDone={(keep) => {
                select(new Set(keep));
                // The bar is gone with the selection; focus returns to where selecting starts.
                if (keep.length === 0) {
                  document
                    .querySelector<HTMLElement>(
                      'input[aria-label="Select all on this page"]',
                    )
                    ?.focus();
                }
              }}
            />
          ) : undefined
        }
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
            onRowClick={(shipment) => peek.open(shipment.id)}
            selectedKey={peek.peekId}
            selection={{
              keys: selectedKeys,
              onChange: select,
              getLabel: (shipment) => shipment.trackingCode,
            }}
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
      <ListPeek peek={peek} rows={rows} hrefFor={ROUTES.sellerShipment}>
        {(id) => <SellerShipmentPeek id={id} />}
      </ListPeek>
    </div>
  );
}
