'use client';

import { StackedColumns } from '@/components/common/charts/stacked-columns';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { fitVolume } from '@/features/shipments/lib/volume-buckets';
import type { SellerMetrics } from '@/features/shipments/types';
import { useElementWidth } from '@/hooks/use-element-width';
import { type StatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatMonthDay } from '@/lib/format-date';
import { hasEnoughData } from '@/lib/metrics';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

// Bottom to top: the order that keeps green and red apart for colour vision (visual-ideas).
const SERIES = [
  {
    key: 'delivered',
    label: 'Delivered',
    className: SHIPMENT_STATUS_DOT.DELIVERED,
  },
  { key: 'open', label: 'Open', className: SHIPMENT_STATUS_DOT.IN_TRANSIT },
  {
    key: 'problem',
    label: 'Problem',
    className: SHIPMENT_STATUS_DOT.FAILED_DELIVERY,
  },
] as const;

export function VolumePanel({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll);
  const busy = metrics.isPlaceholderData;
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const volume = metrics.data && fitVolume(metrics.data.volume, width);

  return (
    <div
      ref={ref}
      aria-busy={busy}
      className={cn('transition-opacity', busy && 'opacity-60')}
    >
      <Panel
        title={
          <>
            Volume{' '}
            <span className="text-[13px] font-normal text-muted-foreground">
              · {windowLabel(statsWindow)}, by {volume?.label ?? 'day'}
            </span>
          </>
        }
      >
        <QueryState
          query={metrics}
          skeleton={<QuerySkeleton variant="lines" />}
          errorMessage="Couldn't load the window's metrics."
        >
          {(data) =>
            hasEnoughData(data.shipments) ? (
              <VolumeChart metrics={data} width={width} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Volume shows once you have 5 shipments in this window.
              </p>
            )
          }
        </QueryState>
      </Panel>
    </div>
  );
}

function VolumeChart({
  metrics: { volume, cancelled, firstAttempt },
  width,
}: {
  metrics: SellerMetrics;
  width: number | undefined;
}) {
  const fitted = fitVolume(volume, width);
  const columns = fitted.points.map((point) => ({
    key: point.start,
    label: formatMonthDay(point.start),
    values: SERIES.map(({ key }) => point[key]),
  }));
  const totals = SERIES.map((_, index) =>
    columns.reduce((sum, column) => sum + column.values[index], 0),
  );
  const perBucket = columns
    .map((column) => column.values.reduce((sum, value) => sum + value, 0))
    .join(', ');

  return (
    <>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {SERIES.map((item, index) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('size-2.5 rounded-xs bg-current', item.className)}
            />
            {item.label} <span className="font-semibold">{totals[index]}</span>
            {item.key === 'problem' && (
              <span className="text-muted-foreground">
                ({firstAttempt.failed} failed · {firstAttempt.returned}{' '}
                returned)
              </span>
            )}
          </li>
        ))}
      </ul>
      <StackedColumns
        series={[...SERIES]}
        columns={columns}
        label={`Shipments created per ${fitted.label}: ${perBucket}`}
      />
      <p className="text-xs text-muted-foreground">
        By creation date, coloured by status now.
        {fitted.merged &&
          ` Grouped by ${fitted.label} to keep each column tappable.`}
        {cancelled > 0 && ` ${cancelled} cancelled not shown.`}
      </p>
    </>
  );
}
