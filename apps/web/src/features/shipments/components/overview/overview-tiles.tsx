'use client';

import type { ReactNode } from 'react';
import {
  MiniColumns,
  RateDots,
  SegmentBar,
  SpanBar,
  TickTrack,
} from '@/components/common/charts/micro-figures';
import { PIPELINE_STATUSES } from '@/components/common/charts/pipeline-bar';
import {
  FirstAttemptTile,
  MedianDeliveryTile,
} from '@/components/common/delivery-tiles';
import { DeltaText } from '@/components/common/delta-text';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import {
  type OverviewPoll,
  useSellerAttention,
  useSellerCounts,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { windowDeltas } from '@/features/shipments/lib/overview-rules';
import type { SellerMetrics } from '@/features/shipments/types';
import { useNow } from '@/hooks/use-now';
import { type StatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import { hasEnoughData, ON_TIME_TARGET } from '@/lib/metrics';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

const SLA_REFRESH_MS = 60_000;
const HOUR_MS = 3_600_000;
// Most late shipments are hours, not days, past due.
const LATE_TRACK_HOURS = 12;

type WindowDelta = ReturnType<typeof windowDeltas>['onTime'];

const hoursSince = (iso: string, now: Date) =>
  (now.getTime() - Date.parse(iso)) / HOUR_MS;

export function OverviewTiles({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll);

  return (
    <div className="grid grid-cols-2 gap-4 @min-[600px]:grid-cols-3 @min-[1100px]:grid-cols-6">
      <ActiveTile poll={poll} />
      <LateTile poll={poll} />
      {metrics.data ? (
        <WindowTiles
          metrics={metrics.data}
          statsWindow={statsWindow}
          busy={metrics.isPlaceholderData}
        />
      ) : (
        <div className="col-span-2 @min-[600px]:col-span-3 @min-[1100px]:col-span-4">
          <QueryState
            query={metrics}
            skeleton={<QuerySkeleton />}
            errorMessage="Couldn't load the window's metrics."
          >
            {() => null}
          </QueryState>
        </div>
      )}
    </div>
  );
}

// The board's notes differ at 390: the narrow one drops what the figure already says.
function Note({ wide, narrow }: { wide: ReactNode; narrow: ReactNode }) {
  return (
    <>
      <span className="@max-[600px]:hidden">{wide}</span>
      <span className="@min-[600px]:hidden">{narrow}</span>
    </>
  );
}

// The narrow note carries the delta; an immature window says so at every width.
function DeltaNote({
  n,
  delta,
  wide,
}: {
  n: number;
  delta: WindowDelta;
  wide: string;
}) {
  if (delta === 'immature') return 'Comparison once more shipments close';
  return (
    <Note
      wide={wide}
      narrow={
        <>
          n={n}
          {delta && (
            <>
              {' · '}
              <DeltaText {...delta} />
            </>
          )}
        </>
      }
    />
  );
}

// The previous window's numbers stay, dimmed, until the new ones arrive.
function WindowCell({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-busy={busy}
      className={cn('grid transition-opacity', busy && 'opacity-60')}
    >
      {children}
    </div>
  );
}

function ActiveTile({ poll }: { poll: OverviewPoll }) {
  const counts = useSellerCounts(poll);
  const oldestPendingAt = useSellerAttention(poll).data?.oldestPendingAt;
  const oldest =
    oldestPendingAt && formatDuration(hoursSince(oldestPendingAt, new Date()));

  return (
    <QueryState
      query={counts}
      errorMessage="Couldn't load the active shipments."
    >
      {(counts) => {
        const active = PIPELINE_STATUSES.reduce(
          (sum, status) => sum + counts[status],
          0,
        );
        return (
          <StatTile
            label="Active"
            scope="now"
            value={active}
            href={ROUTES.sellerShipmentList('view=active')}
            linkLabel="View active shipments"
            figure={
              <SegmentBar
                segments={PIPELINE_STATUSES.map((status) => ({
                  key: status,
                  value: counts[status],
                  className: SHIPMENT_STATUS_DOT[status],
                }))}
              />
            }
            note={
              oldest ? (
                <Note
                  wide={`${counts.PENDING} unclaimed · oldest ${oldest}`}
                  narrow={`Oldest unclaimed ${oldest}`}
                />
              ) : (
                `${counts.PENDING} unclaimed`
              )
            }
          />
        );
      }}
    </QueryState>
  );
}

function LateTile({ poll }: { poll: OverviewPoll }) {
  const attention = useSellerAttention(poll);
  const now = useNow(SLA_REFRESH_MS);

  return (
    <QueryState
      query={attention}
      errorMessage="Couldn't load the late shipments."
    >
      {({ counts: { late }, groups }) => (
        <StatTile
          label="Late"
          scope="now"
          value={late}
          tone={late > 0 ? 'critical' : undefined}
          href={ROUTES.sellerShipmentList('view=late')}
          linkLabel="View late shipments"
          figure={
            late > 0 && (
              <TickTrack
                values={
                  groups
                    .find((group) => group.type === 'late')
                    ?.items.map((item) => hoursSince(item.since, now)) ?? []
                }
                max={LATE_TRACK_HOURS}
              />
            )
          }
          note={
            late > 0
              ? `past due · 0 to ${LATE_TRACK_HOURS} h`
              : 'Nothing past its due time'
          }
        />
      )}
    </QueryState>
  );
}

function WindowTiles({
  metrics,
  statsWindow,
  busy,
}: {
  metrics: SellerMetrics;
  statsWindow: StatsWindow;
  busy: boolean;
}) {
  const scope = windowLabel(statsWindow);
  const deltas = windowDeltas(metrics);
  const { onTime, medianDelivery, firstAttempt, volume, slaMedianHours } =
    metrics;
  const windowParam = `window=${statsWindow}`;
  const p90 = medianDelivery.p90Hours;
  const onTimeRate = hasEnoughData(onTime.n) ? onTime.rate : null;
  const previousOnTime =
    deltas.onTime === 'immature' ? undefined : deltas.onTime?.previous;
  const sla =
    slaMedianHours === null ? '' : ` · SLA ${formatDuration(slaMedianHours)}`;
  const previous =
    previousOnTime === undefined
      ? ''
      : `○ prev ${previousOnTime.toFixed(1)}% · `;

  return (
    <>
      <WindowCell busy={busy}>
        <StatTile
          label="On time"
          scope={scope}
          value={onTimeRate === null ? '—' : `${onTimeRate.toFixed(1)}%`}
          href={ROUTES.sellerShipmentList(
            `status=DELIVERED&${windowParam}&sla=late`,
          )}
          linkLabel="View late deliveries"
          figure={
            onTimeRate !== null && (
              <RateDots
                rate={onTimeRate}
                previous={previousOnTime}
                target={ON_TIME_TARGET}
              />
            )
          }
          note={
            onTimeRate !== null ? (
              <DeltaNote
                n={onTime.n}
                delta={deltas.onTime}
                wide={`n=${onTime.n} · ${previous}| ${ON_TIME_TARGET}%`}
              />
            ) : (
              `Not enough history (n=${onTime.n})`
            )
          }
          definition={`Delivered by the due time ÷ deliveries with a due time, among shipments created in the last ${scope} (n=${onTime.n}). Compared with the ${scope} before once both have 5 deliveries and 80% of this window's shipments are done or past due.`}
        />
      </WindowCell>
      <WindowCell busy={busy}>
        <StatTile
          label="Delivered"
          scope={scope}
          value={metrics.delivered}
          href={ROUTES.sellerShipmentList(`status=DELIVERED&${windowParam}`)}
          linkLabel="View delivered shipments"
          figure={
            <MiniColumns
              values={volume.points.map(
                (point) => point.delivered + point.problem + point.open,
              )}
            />
          }
          note={
            <Note
              wide={`of ${metrics.shipments} created · per ${volume.bucket}`}
              narrow={`of ${metrics.shipments} created`}
            />
          }
        />
      </WindowCell>
      <WindowCell busy={busy}>
        <MedianDeliveryTile
          label="Delivery time"
          metric={medianDelivery}
          scope={scope}
          figure={
            medianDelivery.hours !== null &&
            p90 !== null &&
            slaMedianHours !== null && (
              <SpanBar
                from={medianDelivery.hours}
                to={p90}
                limit={slaMedianHours}
              />
            )
          }
          note={
            p90 !== null && (
              <Note
                wide={`p90 ${formatDuration(p90)}${sla} · n=${medianDelivery.n}`}
                narrow={`p90 ${formatDuration(p90)} · n=${medianDelivery.n}`}
              />
            )
          }
        />
      </WindowCell>
      <WindowCell busy={busy}>
        <FirstAttemptTile
          metric={firstAttempt}
          scope={scope}
          href={ROUTES.sellerShipmentList('view=exceptions')}
          linkLabel="View exceptions"
          figure={
            <SegmentBar
              segments={[
                {
                  key: 'first',
                  value:
                    firstAttempt.n -
                    firstAttempt.failed -
                    firstAttempt.returned,
                  className: 'text-primary',
                },
                {
                  key: 'failed',
                  value: firstAttempt.failed,
                  className: SHIPMENT_STATUS_DOT.FAILED_DELIVERY,
                },
                {
                  key: 'returned',
                  value: firstAttempt.returned,
                  className: SHIPMENT_STATUS_DOT.RETURNED,
                },
              ]}
            />
          }
          note={
            <DeltaNote
              n={firstAttempt.n}
              delta={deltas.firstAttempt}
              wide={`${firstAttempt.failed} failed · ${firstAttempt.returned} returned · n=${firstAttempt.n}`}
            />
          }
        />
      </WindowCell>
    </>
  );
}
