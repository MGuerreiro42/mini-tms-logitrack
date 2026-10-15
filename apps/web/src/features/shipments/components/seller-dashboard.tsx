'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/common/feedback-state';
import { LiveIndicator } from '@/components/common/live-indicator';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { useNow } from '@/hooks/use-now';
import { formatShortDateTime } from '@/lib/format-date';
import type { LiveStatus } from '@/lib/live-status';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import { type AttentionItem, needsAttention } from '../lib/needs-attention';
import type { Shipment } from '../types';
import { SlaSummaryChart } from './sla-summary-chart';

const SLA_REFRESH_MS = 60_000;
const ATTENTION_LIMIT = 5;

const place = (shipment: Shipment) =>
  `${shipment.addressCity}, ${shipment.addressState}`;
const plural = (count: number, noun: string, nouns = `${noun}s`) =>
  `${count} ${count === 1 ? noun : nouns}`;

function onTimeNote({ rate, late }: SellerDashboardData['onTime']): string {
  if (rate === null) return 'No deliveries with an SLA yet';
  if (late === 0) return 'Every delivery within SLA';
  return `${plural(late, 'delivery', 'deliveries')} past SLA`;
}

export function SellerDashboard() {
  const { query, liveStatus } = useSellerDashboard();

  return (
    <QueryState query={query} errorMessage="Couldn't load your dashboard.">
      {(data) => <SellerDashboardView data={data} liveStatus={liveStatus} />}
    </QueryState>
  );
}

function SellerDashboardView({
  data: { counts, onTime, openShipments, recentShipments, slaSummary },
  liveStatus,
}: {
  data: SellerDashboardData;
  liveStatus: LiveStatus;
}) {
  const now = useNow(SLA_REFRESH_MS);

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

  const attention = needsAttention(openShipments, now);
  const failed = attention.filter((item) => item.reason === 'failed').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="In progress"
          value={counts.inProgress}
          note={`${counts.pending} waiting for a carrier`}
        />
        <StatTile
          label="Delivered"
          value={counts.delivered}
          note={`Of ${plural(counts.total, 'shipment')}`}
        />
        <StatTile
          label="On time"
          value={onTime.rate === null ? '—' : `${onTime.rate.toFixed(1)}%`}
          note={onTimeNote(onTime)}
          problem={onTime.late > 0}
        />
        <StatTile
          label="Needs attention"
          value={attention.length}
          note={`${failed} failed, ${attention.length - failed} late`}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <AttentionPanel items={attention} />
          <Card className="px-5.5">
            <SlaSummaryChart data={slaSummary} />
          </Card>
        </div>
        <Panel
          title="Recent shipments"
          className="gap-2.5"
          aside={<LiveIndicator status={liveStatus} />}
          footer={
            <Link
              href={ROUTES.sellerShipments}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all shipments
            </Link>
          }
        >
          <ol>
            {recentShipments.map((shipment) => (
              <li key={shipment.id}>
                <PanelLink href={ROUTES.sellerShipment(shipment.id)}>
                  <span
                    aria-hidden
                    className={cn(
                      'size-2.5 shrink-0 rounded-full bg-current',
                      SHIPMENT_STATUS_DOT[shipment.status],
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      <span className="font-mono text-[13px]">
                        {shipment.trackingCode}
                      </span>{' '}
                      <span className="font-semibold">
                        {SHIPMENT_STATUS_LABEL[shipment.status]}
                      </span>
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {place(shipment)} · {shipment.carrierName}
                    </span>
                  </span>
                  <time
                    dateTime={shipment.createdAt}
                    className="shrink-0 text-[13px] text-muted-foreground"
                  >
                    {formatShortDateTime(shipment.createdAt)}
                  </time>
                </PanelLink>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const hidden = items.length - ATTENTION_LIMIT;

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
      {items.length === 0 ? (
        <p className="border-t border-muted py-3 text-sm text-muted-foreground">
          Nothing needs you right now. Failed deliveries and late shipments show
          up here.
        </p>
      ) : (
        <ul>
          {items.slice(0, ATTENTION_LIMIT).map(({ shipment, reason, sla }) => (
            <li key={shipment.id}>
              <PanelLink href={ROUTES.sellerShipment(shipment.id)}>
                <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-3.5">
                  <span className="shrink-0 font-mono text-[13px] md:w-42">
                    {shipment.trackingCode}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {reason === 'failed'
                        ? 'Delivery attempt failed'
                        : 'Past its SLA'}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {reason === 'failed'
                        ? `${place(shipment)} · ${shipment.carrierName}`
                        : `${place(shipment)} · ${shipment.modalityName} · ${sla.label}`}
                    </span>
                  </span>
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

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex min-h-11 items-center gap-3.5 rounded-sm border-t border-muted px-2 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
