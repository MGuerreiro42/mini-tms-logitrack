'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/common/feedback-state';
import { LiveIndicator } from '@/components/common/live-indicator';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { StatTile } from '@/components/common/stat-tile';
import { TextLink } from '@/components/common/text-link';
import { TrackingCode } from '@/components/common/tracking-code';
import { Button } from '@/components/ui/button';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { useNow } from '@/hooks/use-now';
import type { LiveConnection } from '@/lib/live-status';
import { ON_TIME_TARGET } from '@/lib/metrics';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import type { Shipment, ShipmentAttention } from '../types';
import { ActivityFeed } from './activity-feed';
import { PanelLink } from './panel-link';
import { SlaSummaryChart } from './sla-summary-chart';

const SLA_REFRESH_MS = 60_000;

const place = (shipment: Shipment) =>
  `${shipment.addressCity}, ${shipment.addressState}`;
function onTimeNote({ rate, late }: SellerDashboardData['onTime']): string {
  if (rate === null) return 'No deliveries with an SLA yet';
  if (late === 0) return 'Every delivery within SLA';
  return `${plural(late, 'delivery', 'deliveries')} past SLA`;
}

export function SellerDashboard() {
  const { query, live } = useSellerDashboard();

  return (
    <QueryState query={query} errorMessage="Couldn't load your dashboard.">
      {(data) => <SellerDashboardView data={data} live={live} />}
    </QueryState>
  );
}

function SellerDashboardView({
  data: { counts, onTime, attention, activity, slaSummary },
  live,
}: {
  data: SellerDashboardData;
  live: LiveConnection;
}) {
  if (counts.total === 0) {
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="In progress"
          value={counts.inProgress}
          href={`${ROUTES.sellerShipments}?view=active`}
          note={`${counts.pending} waiting for a carrier`}
        />
        <StatTile
          label="Delivered"
          value={counts.delivered}
          href={`${ROUTES.sellerShipments}?status=DELIVERED`}
          note={`Of ${plural(counts.total, 'shipment')}`}
        />
        <StatTile
          label="On time"
          value={onTime.rate === null ? '—' : `${onTime.rate.toFixed(1)}%`}
          note={onTimeNote(onTime)}
          tone={
            onTime.rate !== null && onTime.rate < ON_TIME_TARGET
              ? 'caution'
              : undefined
          }
        />
        <StatTile
          label="Needs attention"
          value={attention.counts.failed + attention.counts.late}
          href={`${ROUTES.sellerShipments}?view=exceptions`}
          note={`${attention.counts.failed} failed, ${attention.counts.late} late`}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <AttentionPanel attention={attention} />
          <SlaSummaryChart data={slaSummary} />
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
