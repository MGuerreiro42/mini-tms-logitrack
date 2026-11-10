'use client';

import Link from 'next/link';
import { OnTimeRows } from '@/components/common/charts/on-time-rows';
import {
  PIPELINE_STATUSES,
  PipelineBar,
} from '@/components/common/charts/pipeline-bar';
import { EmptyState } from '@/components/common/feedback-state';
import { LiveIndicator } from '@/components/common/live-indicator';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { StatTile } from '@/components/common/stat-tile';
import { TextLink } from '@/components/common/text-link';
import { TrackingCode } from '@/components/common/tracking-code';
import { WindowSelector } from '@/components/common/window-selector';
import { Button } from '@/components/ui/button';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { useNow } from '@/hooks/use-now';
import {
  type StatsWindow,
  useStatsWindow,
  windowLabel,
} from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import type { LiveConnection } from '@/lib/live-status';
import {
  hasEnoughData,
  notEnoughNote,
  ON_TIME_TARGET,
  trendDirection,
} from '@/lib/metrics';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import { sumRecord } from '@/lib/sum-record';
import { cn } from '@/lib/utils';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import type { SellerMetrics, Shipment, ShipmentAttention } from '../types';
import { ActivityFeed } from './activity-feed';
import { PanelLink } from './panel-link';

const SLA_REFRESH_MS = 60_000;
const HOUR_MS = 3_600_000;

const place = (shipment: Shipment) =>
  `${shipment.addressCity}, ${shipment.addressState}`;
const listHref = (search: string) => `${ROUTES.sellerShipments}?${search}`;

export function SellerDashboard() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const { query, metrics, live } = useSellerDashboard(statsWindow);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="What needs you and what is moving now."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <WindowSelector value={statsWindow} onChange={setStatsWindow} />
            <Button asChild>
              <Link href={ROUTES.newShipment}>Create shipment</Link>
            </Button>
          </div>
        }
      />
      <QueryState query={query} errorMessage="Couldn't load your dashboard.">
        {(data) => (
          <SellerDashboardView
            data={data}
            metrics={metrics}
            live={live}
            statsWindow={statsWindow}
          />
        )}
      </QueryState>
    </div>
  );
}

function SellerDashboardView({
  data: { counts, attention, activity },
  metrics,
  live,
  statsWindow,
}: {
  data: SellerDashboardData;
  metrics: ReturnType<typeof useSellerDashboard>['metrics'];
  live: LiveConnection;
  statsWindow: StatsWindow;
}) {
  const now = useNow(SLA_REFRESH_MS);

  if (sumRecord(counts) === 0) {
    return (
      <EmptyState
        title="Send your first shipment"
        description="Two steps, and carriers that cover your customers can pick it up."
        steps={[
          {
            label: 'Enable at least one delivery modality',
            action: (
              <Button asChild variant="link">
                <Link href={ROUTES.sellerModalities}>Modalities</Link>
              </Button>
            ),
          },
          {
            label: 'Create a shipment for a real address',
            action: (
              <Button asChild size="sm">
                <Link href={ROUTES.newShipment}>Create shipment</Link>
              </Button>
            ),
          },
        ]}
      />
    );
  }

  const scope = windowLabel(statsWindow);
  const active = PIPELINE_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );
  const { oldestLateDueAt } = attention;
  const lateNow = attention.counts.late;
  // The previous window's numbers stay, dimmed, until the new ones arrive.
  const busy = metrics.isPlaceholderData;
  const dim = cn('transition-opacity', busy && 'opacity-60');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Active"
          scope="now"
          value={active}
          href={listHref('view=active')}
          linkLabel="View active shipments"
          note={`${counts.PENDING} waiting for a carrier`}
        />
        <StatTile
          label="Late"
          scope="now"
          value={lateNow}
          tone={lateNow > 0 ? 'critical' : undefined}
          href={listHref('view=late')}
          linkLabel="View late shipments"
          note={
            oldestLateDueAt
              ? `oldest ${formatDuration((now.getTime() - Date.parse(oldestLateDueAt)) / HOUR_MS)}`
              : lateNow === 0 && 'Nothing past its due time'
          }
        />
        <div
          aria-busy={busy}
          className={cn('col-span-2 grid grid-cols-2 gap-4', dim)}
        >
          <QueryState
            query={metrics}
            skeleton={<QuerySkeleton />}
            errorMessage="Couldn't load the window's metrics."
          >
            {(data) => (
              <>
                <OnTimeTile onTime={data.onTime} scope={scope} />
                <StatTile
                  label="Delivered"
                  scope={scope}
                  value={data.delivered}
                  href={listHref(`status=DELIVERED&window=${statsWindow}`)}
                  linkLabel="View delivered shipments"
                />
              </>
            )}
          </QueryState>
        </div>
      </div>
      <PipelineBar
        counts={counts}
        hrefFor={(status) => listHref(`status=${status}`)}
      />
      {/* The columns stack on their own (decision 10.11): no panel stretches to the other's height. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <AttentionPanel attention={attention} />
          <div aria-busy={busy} className={dim}>
            <Panel title={`On time by modality · ${scope}`}>
              <QueryState
                query={metrics}
                skeleton={<QuerySkeleton variant="lines" />}
                errorMessage="Couldn't load the window's metrics."
              >
                {(data) =>
                  data.byModality.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No delivery with an SLA in this window yet.
                    </p>
                  ) : (
                    <OnTimeRows
                      rows={data.byModality.map((modality) => ({
                        key: modality.modalityCode,
                        label: modality.modalityName,
                        rate: modality.rate,
                        n: modality.n,
                      }))}
                    />
                  )
                }
              </QueryState>
            </Panel>
          </div>
        </div>
        <Panel
          title="Recent updates"
          className="gap-2.5"
          aside={<LiveIndicator live={live} />}
          footer={
            <TextLink href={ROUTES.sellerShipments} className="text-sm">
              View all shipments
            </TextLink>
          }
        >
          <ActivityFeed events={activity} />
        </Panel>
      </div>
    </div>
  );
}

function OnTimeTile({
  onTime: { n, rate, trend },
  scope,
}: {
  onTime: SellerMetrics['onTime'];
  scope: string;
}) {
  const enough = hasEnoughData(n) && rate !== null;
  return (
    <StatTile
      label="On time"
      scope={scope}
      value={enough ? `${rate.toFixed(1)}%` : '—'}
      tone={enough && rate < ON_TIME_TARGET ? 'caution' : undefined}
      sparkline={enough ? trend : undefined}
      target={ON_TIME_TARGET}
      note={
        enough
          ? `n=${n} · target ${ON_TIME_TARGET}%`
          : notEnoughNote(n, 'deliveries')
      }
      definition={`Delivered by the due time ÷ deliveries with a due time, among shipments created in the last ${scope} (n=${n}). Shipments without an SLA are left out. Trend over the window: ${trendDirection(trend)}.`}
    />
  );
}

function AttentionPanel({
  attention: { shipments, counts },
}: {
  attention: ShipmentAttention;
}) {
  const now = useNow(SLA_REFRESH_MS);
  const hidden = counts.failed + counts.late - shipments.length;

  return (
    <Panel
      title="Needs your attention"
      className="gap-2.5"
      footer={
        hidden > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {plural(hidden, 'more shipment')} not shown
          </span>
        )
      }
    >
      {shipments.length === 0 ? (
        <p className="border-t border-muted py-3 text-sm text-muted-foreground">
          Nothing needs you right now. Failed deliveries and late shipments show
          up here.
        </p>
      ) : (
        <ul>
          {shipments.map((shipment) => (
            <li key={shipment.id}>
              <PanelLink href={ROUTES.sellerShipment(shipment.id)}>
                <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-3.5">
                  <TrackingCode
                    code={shipment.trackingCode}
                    className="shrink-0 text-[13px] md:w-42"
                  />
                  <AttentionReason shipment={shipment} now={now} />
                </span>
                <ShipmentStatusBadge status={shipment.status} />
              </PanelLink>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AttentionReason({ shipment, now }: { shipment: Shipment; now: Date }) {
  const failed = shipment.status === 'FAILED_DELIVERY';

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-semibold">
        {failed ? 'Delivery attempt failed' : 'Past its SLA'}
      </span>
      <span className="truncate text-[13px] text-muted-foreground">
        {failed ? (
          `${place(shipment)} · ${shipment.carrierName}`
        ) : (
          <>
            {place(shipment)} · {shipment.modalityName} ·{' '}
            <RiskBadge state={slaState({ ...shipment, now })} />
          </>
        )}
      </span>
    </span>
  );
}
