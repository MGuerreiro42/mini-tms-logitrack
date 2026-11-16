'use client';

import Link from 'next/link';
import { OnTimeRows } from '@/components/common/charts/on-time-rows';
import {
  PIPELINE_STATUSES,
  PipelineBar,
} from '@/components/common/charts/pipeline-bar';
import { EmptyState } from '@/components/common/feedback-state';
import { LiveIndicator } from '@/components/common/live-indicator';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { PageHeader } from '@/components/common/page-header';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { StatTile } from '@/components/common/stat-tile';
import { TextLink } from '@/components/common/text-link';
import { TrackingCode } from '@/components/common/tracking-code';
import { WindowSelector } from '@/components/common/window-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import {
  type StatsWindow,
  useStatsWindow,
  windowLabel,
} from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import type { LiveConnection } from '@/lib/live-status';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import { sumRecord } from '@/lib/sum-record';
import { cn } from '@/lib/utils';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import type { Shipment, ShipmentAttention } from '../types';
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <ExceptionsPanel attention={attention} />
          {/* Grid items stretch to the row; the modality panel fills the left column so both end flush. */}
          <div aria-busy={busy} className={cn('flex-1', dim)}>
            <Panel title={`On time by modality · ${scope}`} className="h-full">
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
              See all updates
            </TextLink>
          }
        >
          <ActivityFeed events={activity} />
        </Panel>
      </div>
    </div>
  );
}

function ExceptionsPanel({
  attention: { shipments, counts },
}: {
  attention: ShipmentAttention;
}) {
  const now = useNow(SLA_REFRESH_MS);
  const total = counts.failed + counts.late;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Exceptions
          <Badge variant="secondary" aria-hidden>
            {total}
          </Badge>
        </span>
      }
      aside={
        // Announced with its noun when the number changes, not on first render.
        <span className="sr-only" aria-live="polite">
          {plural(total, 'exception')}
        </span>
      }
      description={
        total > 0 ? `${counts.late} late · ${counts.failed} failed` : undefined
      }
      className="gap-2.5"
      footer={
        total > shipments.length && (
          <TextLink href={listHref('view=exceptions')} className="text-sm">
            All exceptions
          </TextLink>
        )
      }
    >
      {shipments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing needs you right now.
        </p>
      ) : (
        <ul>
          {shipments.map((shipment) => (
            <li key={shipment.id}>
              <PanelLink href={ROUTES.sellerShipment(shipment.id)}>
                {/* A fixed column, so the codes line up whatever the badge says. */}
                <span className="w-22 shrink-0">
                  <RiskBadge state={slaState({ ...shipment, now })} />
                </span>
                <TrackingCode
                  code={shipment.trackingCode}
                  className="shrink-0 text-[13px]"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {place(shipment)} · {shipment.modalityName}
                </span>
              </PanelLink>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
