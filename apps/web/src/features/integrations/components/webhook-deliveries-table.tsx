'use client';

import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  statusFilterOptions,
  statusFilterValues,
  ViewTabs,
} from '@/components/common/view-tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL } from '@/lib/filters';
import {
  formatDateTime,
  formatTimeAgo,
  formatTimeUntil,
} from '@/lib/format-date';
import type { LiveStatus } from '@/lib/live-status';
import { plural } from '@/lib/plural';
import {
  useReplayDelivery,
  useWebhookDeliveries,
} from '../hooks/use-webhook-deliveries';
import {
  WEBHOOK_DELIVERY_STATUS,
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOK_EVENT_LABEL,
} from '../lib/delivery-status';
import type { WebhookDelivery, WebhookDeliveryStatus } from '../types';

const STATUS_OPTIONS = statusFilterOptions(
  WEBHOOK_DELIVERY_STATUS,
  WEBHOOK_DELIVERY_STATUSES,
);
const STATUS_VALUES = statusFilterValues(STATUS_OPTIONS);

const TIME_REFRESH_MS = 15_000;
// A retry countdown is in seconds.
const COUNTDOWN_REFRESH_MS = 1_000;

export function WebhookDeliveriesTable({
  liveStatus,
}: {
  liveStatus: LiveStatus;
}) {
  const { filters, defaults, isFiltered, setFilters, setPage, params } =
    useFilteredPagination(
      { status: ALL as StatusFilter<WebhookDeliveryStatus> },
      { status: STATUS_VALUES },
    );
  const query = useWebhookDeliveries(params, liveStatus);
  const replay = useReplayDelivery();
  const counting = query.data?.data.some((delivery) => delivery.nextAttemptAt);
  const now = useNow(counting ? COUNTDOWN_REFRESH_MS : TIME_REFRESH_MS);

  return (
    <section className="space-y-4" aria-labelledby="delivery-log-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="delivery-log-title" className="text-base font-semibold">
          Delivery log
        </h2>
        <ViewTabs
          options={STATUS_OPTIONS}
          filters={filters}
          defaults={defaults}
          onChange={setFilters}
        />
      </div>
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load the delivery log."
      >
        {(result) => (
          <PaginatedTable<WebhookDelivery>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(delivery) => delivery.id}
            getRowVersion={(delivery) =>
              `${delivery.status}:${delivery.attempts}`
            }
            emptyMessage={
              isFiltered
                ? 'No deliveries with this status.'
                : 'No deliveries yet. They start with your next shipment update.'
            }
            columns={[
              {
                header: 'Event',
                card: 'title',
                cell: (d) => (
                  <span className="font-mono text-[13px]">
                    {WEBHOOK_EVENT_LABEL[d.event]}
                  </span>
                ),
              },
              {
                header: 'Status',
                card: 'badge',
                cell: (d) => (
                  <Badge
                    variant="plain"
                    className={WEBHOOK_DELIVERY_STATUS[d.status].className}
                  >
                    {WEBHOOK_DELIVERY_STATUS[d.status].label}
                  </Badge>
                ),
              },
              {
                header: 'Attempts',
                card: 'meta',
                cell: (d) => plural(d.attempts, 'attempt'),
              },
              {
                header: 'Response',
                card: 'meta',
                cell: (d) =>
                  d.responseCode === null
                    ? 'No response'
                    : `HTTP ${d.responseCode}`,
              },
              {
                header: 'Duration',
                hideBelow: 'lg',
                cell: (d) =>
                  d.durationMs === null ? '—' : `${d.durationMs} ms`,
              },
              {
                header: 'Next retry',
                cell: (d) =>
                  d.nextAttemptAt && (
                    <time
                      dateTime={d.nextAttemptAt}
                      title={formatDateTime(d.nextAttemptAt)}
                    >
                      {formatTimeUntil(d.nextAttemptAt, now)}
                    </time>
                  ),
              },
              {
                header: 'Last error',
                cell: (d) =>
                  d.error && (
                    <span
                      title={d.error}
                      className="block max-w-56 truncate text-muted-foreground"
                    >
                      {d.error}
                    </span>
                  ),
              },
              {
                header: 'Created',
                hideBelow: 'lg',
                className: 'text-muted-foreground',
                cell: (d) => formatTimeAgo(d.createdAt, now),
              },
              {
                id: 'actions',
                header: '',
                card: 'action',
                className: 'text-right',
                cell: (d) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Replay ${WEBHOOK_EVENT_LABEL[d.event]} from ${formatTimeAgo(d.createdAt, now)}`}
                    disabled={replay.isPending && replay.variables === d.id}
                    onClick={() => replay.mutate(d.id)}
                  >
                    Replay
                  </Button>
                ),
              },
            ]}
          />
        )}
      </QueryState>
    </section>
  );
}
